// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::WindowEvent;

const ERROR_JS: &str = r#"
(function () {
  var b = document.createElement('div');
  b.style.cssText = 'height:100vh;display:flex;align-items:center;justify-content:center;background:#0b1220;color:#e2e8f0;font-family:Segoe UI,sans-serif;text-align:center';
  b.innerHTML = '<div><h1 style="font-size:24px;margin-bottom:8px">InsightForge</h1>'
    + '<p style="color:#f87171">Connection failed. Check your internet and try again.</p>'
    + '<button id="r" style="margin-top:24px;padding:10px 28px;border:none;border-radius:8px;background:#3b82f6;color:#fff;font-size:15px;cursor:pointer">Retry</button></div>';
  (document.body || document.documentElement).appendChild(b);
  var btn = document.getElementById('r');
  if (btn) btn.onclick = function () { location.href = 'https://insights-forge-aie6.vercel.app/'; };
})();
"#;

pub mod app_lib;

fn main() {
  app_lib::run();
}

#[tauri::command]
fn check_for_update(label: String, version: String) -> bool {
  label == version
}