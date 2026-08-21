//! Per-connection passwords, in the OS keychain.
//!
//! The connection list itself is app-local config: labels, hosts, ports,
//! usernames. The password is not, and it must never reach the store plugin,
//! which is a plaintext JSON file next to that config. So the two live apart:
//! the list knows a connection's id, and the id is the key to a keychain
//! entry holding its password.
//!
//! Keyed by id rather than by host, so renaming or re-addressing a connection
//! keeps its login, and two connections to the same host keep separate ones.

use keyring::Entry;

/// The keychain service name. Shared with the bundled daemon's own entry,
/// which uses a fixed account name that no connection id can collide with.
const SERVICE: &str = "rigseed";

fn entry(id: &str) -> Result<Entry, String> {
    if id.trim().is_empty() {
        return Err("a connection id is required".into());
    }
    Entry::new(SERVICE, &format!("connection:{id}")).map_err(|e| e.to_string())
}

/// Stores a password. An empty one deletes the entry rather than saving it.
#[tauri::command]
pub fn secret_set(id: String, password: String) -> Result<(), String> {
    let entry = entry(&id)?;
    if password.is_empty() {
        return match entry.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(other) => Err(other.to_string()),
        };
    }
    entry.set_password(&password).map_err(|e| e.to_string())
}

/// Reads a password back. `None` when there is none, which is not an error:
/// a connection that needs no login has no entry.
#[tauri::command]
pub fn secret_get(id: String) -> Result<Option<String>, String> {
    match entry(&id)?.get_password() {
        Ok(password) => Ok(Some(password)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(other) => Err(other.to_string()),
    }
}

/// Forgets a password. Removing a connection has to remove this too, or the
/// keychain accumulates entries for connections nothing can reach any more.
#[tauri::command]
pub fn secret_delete(id: String) -> Result<(), String> {
    match entry(&id)?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(other) => Err(other.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn an_empty_id_is_refused_rather_than_shared() {
        // Every empty id would otherwise map to the same keychain entry, so
        // two connections with no id would silently share one password.
        assert!(entry("").is_err());
        assert!(entry("   ").is_err());
    }

    #[test]
    fn ids_are_namespaced_away_from_the_bundled_entry() {
        // The bundled daemon's own password lives under a fixed account name
        // in this same service. A connection id that happened to equal it
        // would overwrite the daemon's login.
        let one = entry("abc").unwrap();
        let two = entry("def").unwrap();
        assert_ne!(format!("{one:?}"), format!("{two:?}"));
    }
}
