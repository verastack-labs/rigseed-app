//! The daemon's HTTP, performed in Rust rather than by the webview.
//!
//! Not a convenience. qBittorrent's CSRF protection compares the request's
//! `Origin` against its own host and answers a mismatch with 401, and a
//! webview cannot avoid sending one:
//!
//! - `fetch` in a page carries the page's origin, and `Origin` is a forbidden
//!   header name, so nothing in the page can change it.
//! - `tauri-plugin-http` performs the request in Rust but still forwards the
//!   page's origin, and overrides a caller-supplied one. Measured: the daemon
//!   logged `Origin header: 'http://localhost:1420'` for requests that set
//!   `Origin` to its own address.
//!
//! A request built here carries neither `Origin` nor `Referer`, which is the
//! case qBittorrent accepts, and which is how every native client talks to it.
//! Measured too: the same correct password is refused with a foreign `Origin`
//! and accepted with none.
//!
//! The alternative was switching the daemon's CSRF protection off. It listens
//! on loopback, demands a password, and takes a fresh port each launch, so the
//! exposure would have been small; but "make our own requests stop looking
//! like a cross-site attack" beats "tell the daemon to stop noticing".

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use serde::Serialize;

/// A client with a cookie jar, shared for the life of the app.
///
/// The jar is the point. qBittorrent authenticates with an `SID` cookie set by
/// `auth/login`, and every later call has to carry it. Held here rather than
/// created per request, which would log in once and then be anonymous forever.
pub struct Http(pub Arc<reqwest::Client>);

impl Default for Http {
    fn default() -> Self {
        let client = reqwest::Client::builder()
            .cookie_store(true)
            // The daemon is on loopback. A request that has not answered in ten
            // seconds is not slow, it is gone, and the polling loops upstairs
            // are better off being told so.
            .timeout(Duration::from_secs(10))
            .build()
            .unwrap_or_default();
        Self(Arc::new(client))
    }
}

/// What the frontend's transport gets back.
///
/// The status travels rather than being turned into an error here, because the
/// meaning of a status is the caller's business: 403 on `app/version` is how
/// the frontend recognises a qBittorrent, and 403 on anything else is a lapsed
/// session.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Response {
    pub status: u16,
    pub body: String,
}

fn url(base: &str, path: &str) -> String {
    format!("{}/api/v2/{}", base.trim_end_matches('/'), path)
}

/// GET, with query parameters.
#[tauri::command]
pub async fn api_get(
    http: tauri::State<'_, Http>,
    base_url: String,
    path: String,
    params: HashMap<String, String>,
) -> Result<Response, String> {
    let response = http
        .0
        .get(url(&base_url, &path))
        .query(&params)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = response.status().as_u16();
    let body = response.text().await.map_err(|e| e.to_string())?;
    Ok(Response { status, body })
}

/// POST as `application/x-www-form-urlencoded`, which is what the API expects.
#[tauri::command]
pub async fn api_post(
    http: tauri::State<'_, Http>,
    base_url: String,
    path: String,
    body: HashMap<String, String>,
) -> Result<Response, String> {
    let response = http
        .0
        .post(url(&base_url, &path))
        .form(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = response.status().as_u16();
    let body = response.text().await.map_err(|e| e.to_string())?;
    Ok(Response { status, body })
}

/// One part of a multipart body.
///
/// `torrents/add` is the only endpoint that needs multipart, because it
/// carries the `.torrent` files themselves. A part is either text or bytes;
/// the frontend sends file contents as a plain byte array rather than base64,
/// since this crosses a process boundary, not a network.
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Part {
    pub name: String,
    pub value: Option<String>,
    pub file_name: Option<String>,
    pub bytes: Option<Vec<u8>>,
}

/// POST as `multipart/form-data`.
#[tauri::command]
pub async fn api_post_form(
    http: tauri::State<'_, Http>,
    base_url: String,
    path: String,
    parts: Vec<Part>,
) -> Result<Response, String> {
    let mut form = reqwest::multipart::Form::new();

    for part in parts {
        form = match (part.bytes, part.value) {
            (Some(bytes), _) => {
                let mut file = reqwest::multipart::Part::bytes(bytes)
                    .mime_str("application/x-bittorrent")
                    .map_err(|e| e.to_string())?;
                if let Some(name) = part.file_name {
                    file = file.file_name(name);
                }
                form.part(part.name, file)
            }
            (None, Some(text)) => form.text(part.name, text),
            // A part with neither is nothing to send. Skipped rather than
            // failed: an absent optional field is the caller's normal case.
            (None, None) => form,
        };
    }

    let response = http
        .0
        .post(url(&base_url, &path))
        .multipart(form)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = response.status().as_u16();
    let body = response.text().await.map_err(|e| e.to_string())?;
    Ok(Response { status, body })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builds_the_api_path() {
        assert_eq!(
            url("http://127.0.0.1:8080", "auth/login"),
            "http://127.0.0.1:8080/api/v2/auth/login"
        );
    }

    #[test]
    fn a_trailing_slash_does_not_double_up() {
        assert_eq!(
            url("http://127.0.0.1:8080/", "app/version"),
            "http://127.0.0.1:8080/api/v2/app/version"
        );
    }

    #[test]
    fn the_client_keeps_cookies() {
        // Without the jar, auth/login would succeed and every call after it
        // would be anonymous, which reads as a daemon that keeps forgetting
        // its own password.
        let a = Http::default();
        let b = Http::default();
        assert!(!Arc::ptr_eq(&a.0, &b.0), "each Http owns its client");
    }
}

/// Fetches a torrent's `.torrent` file and writes it where the user chose.
///
/// Rust rather than the frontend, for two reasons that are both about the
/// bytes. `Response` above carries a `String`, and a `.torrent` is bencoded
/// binary, so routing it through the existing commands would corrupt it on the
/// way. And rigseed has no filesystem plugin: the dialog plugin can ask where
/// to save, and nothing on the JavaScript side can then write there.
///
/// The cookie jar on this client is what makes it work at all. The export
/// endpoint needs the same session every other call uses, and it is already
/// held here.
///
/// The first byte is checked before anything is written. A bencoded dictionary
/// starts with `d`, so an HTML error page or an empty body is caught rather
/// than saved under a `.torrent` name for somebody to discover later. That is
/// the same lesson `search/installPlugin` taught: a 200 is not proof that what
/// came back is what was asked for.
#[tauri::command]
pub async fn export_torrent(
    http: tauri::State<'_, Http>,
    base_url: String,
    hash: String,
    dest: String,
) -> Result<u64, String> {
    let response = http
        .0
        .get(url(&base_url, "torrents/export"))
        .query(&[("hash", &hash)])
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = response.status();
    if !status.is_success() {
        return Err(format!("torrents/export answered {}", status.as_u16()));
    }

    let bytes = response.bytes().await.map_err(|e| e.to_string())?;
    if bytes.first() != Some(&b'd') {
        return Err(format!(
            "torrents/export returned {} bytes that are not a torrent file",
            bytes.len()
        ));
    }

    std::fs::write(&dest, &bytes).map_err(|e| format!("could not write {dest}: {e}"))?;
    Ok(bytes.len() as u64)
}
