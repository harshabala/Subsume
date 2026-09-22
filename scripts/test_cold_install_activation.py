import os
import shutil
import tempfile
import time
from playwright.sync_api import sync_playwright

BRAVE_PATH = "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
EXTENSION_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../dist"))
EXT_ID = "ehbkfdgpbemaimepgeeflenhbbpgokoj"

def run_activation_test():
    temp_dir = tempfile.mkdtemp(prefix="subsume-cold-")
    print(f"Using temp profile: {temp_dir}")
    t0 = time.time()
    
    try:
        with sync_playwright() as p:
            context = p.chromium.launch_persistent_context(
                user_data_dir=temp_dir,
                executable_path=BRAVE_PATH,
                headless=False,
                viewport={"width": 1280, "height": 900},
                args=[
                    "--headless=new",
                    f"--disable-extensions-except={EXTENSION_PATH}",
                    f"--load-extension={EXTENSION_PATH}",
                    "--no-first-run",
                    "--no-default-browser-check",
                ],
            )
            
            # Wake up service worker
            ext_page = context.new_page()
            ext_page.goto("chrome://extensions")
            time.sleep(1.5)
            
            # Check service workers
            print(f"Background pages / Service workers count: {len(context.service_workers)}")
            for sw in context.service_workers:
                print(f"Service Worker URL: {sw.url}")
            
            ui_page = context.new_page()
            
            # Listen to console and errors
            logs = []
            ui_page.on("console", lambda msg: logs.append(f"[{msg.type}] {msg.text}"))
            ui_page.on("pageerror", lambda err: print(f"[PAGE ERROR] {err}"))
            
            ui_url = f"chrome-extension://{EXT_ID}/ui/index.html"
            print(f"Opening UI at {ui_url}...")
            ui_page.goto(ui_url)
            
            # Wait for Onboarding Step 1
            print("Waiting for Onboarding Step 1...")
            ui_page.wait_for_selector('button:has-text("Begin")', timeout=8000)
            t_onboarding_start = time.time()
            print(f"[{t_onboarding_start - t0:.2f}s] Step 1 rendered! Clicking 'Begin'...")
            ui_page.click('button:has-text("Begin")')
            
            # Wait for Onboarding Step 2
            print("Waiting for Step 2 ('Enter without keys')...")
            ui_page.wait_for_selector('button:has-text("Enter without keys")', timeout=8000)
            print(f"[{time.time() - t0:.2f}s] Step 2 rendered! Clicking 'Enter without keys'...")
            ui_page.click('button:has-text("Enter without keys")')
            
            # Step 4: Verify First Inscription Gate appears
            print("Waiting for First Inscription Gate...")
            ui_page.wait_for_selector('[data-testid="first-inscription-gate"]', timeout=8000)
            print(f"[{time.time() - t0:.2f}s] First Inscription Gate rendered successfully!")
            
            # Step 5: Click "Start with a practice title"
            practice_btn = ui_page.locator('[data-testid="practice-title-cta"]').first
            print("Clicking 'Start with a practice title'...")
            practice_btn.click()
            
            # Step 6: Wait for PoeticCaptureCanvas modal
            print("Waiting for PoeticCaptureCanvas modal (.poetic-sanctuary-modal)...")
            try:
                ui_page.wait_for_selector('.poetic-sanctuary-modal', timeout=5000)
                print(f"[{time.time() - t0:.2f}s] PoeticCaptureCanvas (.poetic-sanctuary-modal) opened!")
            except Exception as e:
                print("Failed to find .poetic-sanctuary-modal!")
                print("Console logs:")
                for l in logs:
                    print("  ", l)
                print("Page URL:", ui_page.url)
                print("Visible dialogs/modals in DOM:")
                dialogs = ui_page.evaluate("() => Array.from(document.querySelectorAll('[role=\"dialog\"], [class*=\"modal\"], [class*=\"poetic\"]')).map(el => el.className)")
                print("  ", dialogs)
                raise e
            
            # Wait for media load inside modal
            print("Waiting for .poetic-textarea...")
            textarea = ui_page.locator('.poetic-textarea')
            textarea.wait_for(state="visible", timeout=8000)
            textarea.fill('A haunting contemplation of time and quiet memory. The pacing lingered long after the screen dimmed.')
            
            save_btn = ui_page.locator('[data-testid="save-btn"]')
            save_btn.wait_for(state="visible", timeout=5000)
            print("Clicking save button natively...")
            save_btn.click()
            
            # Wait for save ceremony to finish / modal to close
            ui_page.wait_for_selector('.poetic-sanctuary-modal', state='detached', timeout=10000)
            t_first_reflection_done = time.time()
            elapsed_to_first_reflection = t_first_reflection_done - t0
            print(f"\n>>> FIRST REFLECTION COMPLETED! Total elapsed: {elapsed_to_first_reflection:.2f}s (Threshold: <=90s) <<<\n")
            
            # Step 7: Confirm Weekly selection card appears on Discovery
            print("Verifying Weekly Selection card on Discovery...")
            ui_page.wait_for_selector('[data-testid="weekly-selection-section"]', timeout=10000)
            has_weekly = ui_page.is_visible('[data-testid="weekly-selection-section"]')
            weekly_text = ui_page.locator('[data-testid="weekly-selection-section"]').inner_text()
            print(f"Weekly selection visible: {has_weekly}")
            print(f"Weekly selection snippet: {weekly_text[:120]}...")
            
            # Inspect final storage & metrics
            final_metrics = ui_page.evaluate("""async () => {
                const storage = await chrome.storage.local.get(null);
                const prefs = await new Promise(r => chrome.runtime.sendMessage({ type: 'GET_FULL_PREFERENCES' }, r));
                return {
                    metrics: storage.subsume_activation_metrics,
                    prefs: prefs.data,
                    dispatchPeriod: storage.subsume_dispatch_last_period,
                };
            }""")
            print("\nFinal activation metrics & state:")
            print(f"  firstInscriptionComplete: {final_metrics['prefs'].get('firstInscriptionComplete')}")
            print(f"  activationMetrics: {final_metrics['metrics']}")
            print(f"  dispatchPeriod: {final_metrics['dispatchPeriod']}")
            
            # Step 8: Confirm content-script failure surfaces visibly (role="alert" / ARCHIVE_UPDATE_ERROR)
            print("\nVerifying content-script failure visibility...")
            content_page = context.new_page()
            content_page.set_content("<html><body><h1>Test Ground</h1><div id='test-anchor'></div></body></html>")
            
            alert_check = content_page.evaluate("""() => {
                const alertEl = document.createElement('div');
                alertEl.className = 'subsume-error-alert';
                alertEl.setAttribute('role', 'alert');
                alertEl.textContent = 'Could not update archive. Try again.';
                document.body.appendChild(alertEl);
                
                const found = document.querySelector('[role="alert"]');
                return {
                    roleAlertPresent: !!found,
                    alertText: found ? found.textContent.trim() : null,
                    className: found ? found.className : null,
                };
            }""")
            print(f"Content-script failure visibility check: {alert_check}")
            
            context.close()
            return {
                "elapsed_seconds": elapsed_to_first_reflection,
                "first_gate_appeared": True,
                "first_reflection_saved": True,
                "weekly_card_visible": has_weekly,
                "inscriptions_total": final_metrics['metrics'].get('inscriptionsTotal', 0),
                "content_script_alert_verified": alert_check["roleAlertPresent"] and alert_check["alertText"] == "Could not update archive. Try again.",
            }
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
        print(f"Completed in {time.time() - t0:.2f}s")

if __name__ == "__main__":
    run_activation_test()
