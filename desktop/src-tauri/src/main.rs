#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use std::{
    fs,
    io,
    path::{Path, PathBuf},
    time::SystemTime,
};
use tauri::AppHandle;

const PRODUCT_DIR: &str = "LoLManager";
const SAVES_DIR: &str = "saves";
const SLOT_PREFIX: &str = "slot-";
const SLOT_EXTENSION: &str = ".json";

#[derive(Serialize)]
struct SaveEntry {
    slot: String,
    file_name: String,
    size: Option<u64>,
    modified: Option<u64>,
}

fn ensure_saves_dir(handle: &AppHandle) -> Result<PathBuf, String> {
    let mut path = handle
        .path_resolver()
        .app_data_dir()
        .ok_or_else(|| "failed to resolve app data dir".to_string())?;
    path.push(PRODUCT_DIR);
    path.push(SAVES_DIR);
    fs::create_dir_all(&path).map_err(|err| format!("failed to create save directory: {err}"))?;
    Ok(path)
}

fn sanitize_slot(slot: &str) -> Result<String, String> {
    let trimmed = slot.trim();
    let without_ext = trimmed
        .strip_suffix(SLOT_EXTENSION)
        .unwrap_or(trimmed);

    if !without_ext.starts_with(SLOT_PREFIX) {
        return Err(format!("slot must start with '{SLOT_PREFIX}'"));
    }

    if !without_ext
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_'))
    {
        return Err("slot contains invalid characters".into());
    }

    Ok(without_ext.to_string())
}

fn slot_path(dir: &Path, slot: &str) -> Result<PathBuf, String> {
    let sanitized = sanitize_slot(slot)?;
    let mut path = dir.to_path_buf();
    path.push(format!("{sanitized}{SLOT_EXTENSION}"));
    Ok(path)
}

#[tauri::command]
fn list_saves(handle: AppHandle) -> Result<Vec<SaveEntry>, String> {
    let dir = ensure_saves_dir(&handle)?;
    let mut entries = Vec::new();

    for entry in fs::read_dir(&dir).map_err(|err| format!("failed to read saves dir: {err}"))? {
        let entry = entry.map_err(|err| format!("failed to inspect save entry: {err}"))?;
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        if path.extension().and_then(|ext| ext.to_str()) != Some(&SLOT_EXTENSION[1..]) {
            continue;
        }
        let file_name = match path.file_name().and_then(|name| name.to_str()) {
            Some(name) => name.to_string(),
            None => continue,
        };
        let slot = match file_name.strip_suffix(SLOT_EXTENSION) {
            Some(name) if name.starts_with(SLOT_PREFIX) => name.to_string(),
            _ => continue,
        };

        let metadata = match fs::metadata(&path) {
            Ok(metadata) => metadata,
            Err(err) => {
                eprintln!("failed to read metadata for {:?}: {}", path, err);
                continue;
            }
        };
        let size = metadata.len();
        let modified = metadata.modified().ok().and_then(system_time_to_unix);

        entries.push(SaveEntry {
            slot,
            file_name,
            size: Some(size),
            modified,
        });
    }

    entries.sort_by(|a, b| a.slot.cmp(&b.slot));
    Ok(entries)
}

fn system_time_to_unix(time: SystemTime) -> Option<u64> {
    time
        .duration_since(SystemTime::UNIX_EPOCH)
        .ok()
        .map(|duration| duration.as_secs())
}

#[tauri::command]
fn read_save(handle: AppHandle, slot: String) -> Result<String, String> {
    let dir = ensure_saves_dir(&handle)?;
    let path = slot_path(&dir, &slot)?;
    fs::read_to_string(path).map_err(|err| format!("failed to read save: {err}"))
}

#[tauri::command]
fn write_save(handle: AppHandle, slot: String, contents: String) -> Result<(), String> {
    let dir = ensure_saves_dir(&handle)?;
    let path = slot_path(&dir, &slot)?;
    fs::write(path, contents).map_err(|err| format!("failed to write save: {err}"))
}

#[tauri::command]
fn remove_save(handle: AppHandle, slot: String) -> Result<(), String> {
    let dir = ensure_saves_dir(&handle)?;
    let path = slot_path(&dir, &slot)?;
    match fs::remove_file(&path) {
        Ok(()) => Ok(()),
        Err(err) if err.kind() == io::ErrorKind::NotFound => Ok(()),
        Err(err) => Err(format!("failed to remove save: {err}")),
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            list_saves,
            read_save,
            write_save,
            remove_save
        ])
        .run(|_app_handle, _event| {})
        .expect("failed to run Tauri application");
}
