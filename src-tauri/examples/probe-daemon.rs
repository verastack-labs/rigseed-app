//! Logs in to the bundled daemon through the same code the app uses, and
//! prints exactly what comes back.
//!
//!     cargo run --example probe-daemon -- http://127.0.0.1:43880
//!
//! Exists because "the daemon rejected those credentials" and
//! "WebAPI login success" appeared in the two logs at the same second, which
//! means the request was fine and the answer was being read wrong. Guessing at
//! that from either side was going nowhere.

use std::collections::HashMap;

use rigseed_lib::daemon;

#[tokio::main]
async fn main() {
    let base = std::env::args()
        .nth(1)
        .unwrap_or_else(|| "http://127.0.0.1:43880".into());

    let password = match daemon::ensure_password() {
        Ok(password) => password,
        Err(error) => {
            eprintln!("no stored password: {error}");
            std::process::exit(1);
        }
    };
    println!("password from the keychain: {} characters", password.len());

    let client = reqwest::Client::builder()
        .cookie_store(true)
        .build()
        .expect("client");

    // Unauthenticated, which is what the frontend's probe does first.
    let version = client
        .get(format!("{base}/api/v2/app/version"))
        .send()
        .await
        .expect("app/version");
    println!("app/version before login: {}", version.status());

    let mut form = HashMap::new();
    form.insert("username", "rigseed".to_string());
    form.insert("password", password);

    let login = client
        .post(format!("{base}/api/v2/auth/login"))
        .form(&form)
        .send()
        .await
        .expect("auth/login");

    let status = login.status();
    let body = login.text().await.unwrap_or_default();
    println!("auth/login: {status}");
    println!("  body      : {body:?}");
    println!("  body bytes: {:?}", body.as_bytes());
    println!("  is empty  : {}", body.is_empty());

    let after = client
        .get(format!("{base}/api/v2/app/version"))
        .send()
        .await
        .expect("app/version");
    let status = after.status();
    let text = after.text().await.unwrap_or_default();
    println!("app/version after login: {status} {text:?}");
}
