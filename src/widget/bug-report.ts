import type { Analytics } from "../core/types";

export interface BugReportWidgetOptions {
	/** FAB position. Default: "bottom-right" */
	position?: "bottom-right" | "bottom-left";
	/** FAB button color. Default: "#ef4444" (red) */
	buttonColor?: string;
	/** FAB button text. Default: "Report Bug" */
	buttonText?: string;
}

const BUG_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M144,92a12,12,0,1,1,12,12A12,12,0,0,1,144,92ZM100,104a12,12,0,1,0-12-12A12,12,0,0,0,100,104Zm136,24a8,8,0,0,1-8,8H196v12a92.37,92.37,0,0,1-2.32,20.65l37,25.34A8,8,0,0,1,226,206a8.09,8.09,0,0,1-4.58-1.44l-34.87-23.88a91.85,91.85,0,0,1-117.1,0L34.58,204.56A8.09,8.09,0,0,1,30,206a8,8,0,0,1-4.57-14.56l37-25.34A92.37,92.37,0,0,1,60,148V136H28a8,8,0,0,1,0-16H60V92A68.07,68.07,0,0,1,128,24h0A68.07,68.07,0,0,1,196,92v28h32A8,8,0,0,1,236,128ZM76,148a76,76,0,0,0,152,0V92a52,52,0,0,0-104,0v56Z"/></svg>`;

const CLOSE_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"/></svg>`;

const WIDGET_STYLES = `
  :host { all: initial; }
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }

  .tif-fab {
    position: fixed;
    z-index: 2147483647;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .tif-fab:hover { transform: scale(1.1); box-shadow: 0 6px 16px rgba(0,0,0,0.3); }
  .tif-fab.bottom-right { bottom: 20px; right: 20px; }
  .tif-fab.bottom-left { bottom: 20px; left: 20px; }

  .tif-overlay {
    position: fixed;
    z-index: 2147483647;
    inset: 0;
    background: rgba(0,0,0,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }

  .tif-modal {
    background: white;
    border-radius: 12px;
    width: 100%;
    max-width: 440px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  }

  .tif-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid #e5e7eb;
  }
  .tif-header h2 { font-size: 16px; font-weight: 600; color: #111827; }
  .tif-close {
    background: none;
    border: none;
    cursor: pointer;
    color: #6b7280;
    padding: 4px;
    border-radius: 6px;
    display: flex;
    align-items: center;
  }
  .tif-close:hover { background: #f3f4f6; color: #111827; }

  .tif-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; }

  .tif-field label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: #374151;
    margin-bottom: 6px;
  }
  .tif-field input, .tif-field textarea, .tif-field select {
    width: 100%;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 14px;
    color: #111827;
    outline: none;
    transition: border-color 0.15s;
  }
  .tif-field input:focus, .tif-field textarea:focus, .tif-field select:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
  }
  .tif-field textarea { min-height: 80px; resize: vertical; }

  .tif-screenshot-zone {
    border: 2px dashed #d1d5db;
    border-radius: 8px;
    padding: 16px;
    text-align: center;
    color: #6b7280;
    font-size: 13px;
    cursor: pointer;
    transition: border-color 0.15s;
  }
  .tif-screenshot-zone:hover { border-color: #3b82f6; }
  .tif-screenshot-zone.has-image { border-color: #10b981; background: #f0fdf4; }
  .tif-screenshot-zone img { max-width: 100%; max-height: 120px; margin-top: 8px; border-radius: 4px; }
  .tif-screenshot-zone input[type="file"] { display: none; }

  .tif-context {
    font-size: 12px;
    color: #9ca3af;
    background: #f9fafb;
    border-radius: 6px;
    padding: 8px 12px;
  }
  .tif-context summary { cursor: pointer; font-weight: 500; }
  .tif-context pre { margin-top: 6px; white-space: pre-wrap; word-break: break-all; font-size: 11px; }

  .tif-footer { padding: 12px 20px; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end; gap: 8px; }
  .tif-btn {
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: background 0.15s;
  }
  .tif-btn-cancel { background: #f3f4f6; color: #374151; }
  .tif-btn-cancel:hover { background: #e5e7eb; }
  .tif-btn-submit { background: #3b82f6; color: white; }
  .tif-btn-submit:hover { background: #2563eb; }
  .tif-btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

  .tif-toast {
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    color: white;
    z-index: 2147483647;
    animation: tif-fadein 0.2s;
  }
  .tif-toast.success { background: #10b981; }
  .tif-toast.error { background: #ef4444; }
  @keyframes tif-fadein { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
`;

const MAX_SCREENSHOT_BYTES = 500_000;

/**
 * Escape HTML special characters to prevent XSS
 */
const escapeHtml = (str: string): string => {
	const div = document.createElement("div");
	div.textContent = str;
	return div.innerHTML;
};

/**
 * Resize an image data URL to fit within the size limit
 */
const resizeScreenshot = (dataUrl: string): Promise<string> => {
	return new Promise((resolve) => {
		if (dataUrl.length <= MAX_SCREENSHOT_BYTES) {
			resolve(dataUrl);
			return;
		}

		const img = new Image();
		img.onload = () => {
			try {
				const canvas = document.createElement("canvas");
				let { width, height } = img;
				const scale = Math.sqrt(MAX_SCREENSHOT_BYTES / dataUrl.length);
				width = Math.floor(width * scale);
				height = Math.floor(height * scale);
				canvas.width = width;
				canvas.height = height;
				const ctx = canvas.getContext("2d");
				if (!ctx) {
					resolve(dataUrl);
					return;
				}
				ctx.drawImage(img, 0, 0, width, height);
				resolve(canvas.toDataURL("image/jpeg", 0.7));
			} catch {
				resolve(dataUrl);
			}
		};
		img.onerror = () => {
			resolve(dataUrl);
		};
		img.src = dataUrl;
	});
};

/**
 * Read a file as a data URL
 */
const readFileAsDataUrl = (file: File): Promise<string> => {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
};

/**
 * Create and mount the bug report widget
 */
export const createBugReportWidget = (
	analytics: Analytics,
	options?: BugReportWidgetOptions,
): { destroy: () => void } => {
	const position = options?.position ?? "bottom-right";
	const buttonColor = options?.buttonColor ?? "#ef4444";
	const buttonText = options?.buttonText ?? "Report Bug";

	const host = document.createElement("div");
	host.id = "thisbefine-bug-report";
	const shadow = host.attachShadow({ mode: "open" });

	const style = document.createElement("style");
	style.textContent = WIDGET_STYLES;
	shadow.appendChild(style);

	let screenshotDataUrl: string | null = null;
	let isSubmitting = false;

	const fab = document.createElement("button");
	fab.className = `tif-fab ${position}`;
	fab.style.backgroundColor = buttonColor;
	fab.innerHTML = BUG_ICON_SVG;
	fab.title = buttonText;
	fab.setAttribute("aria-label", buttonText);
	shadow.appendChild(fab);

	const getContextInfo = () => ({
		url: window.location.href,
		browser: navigator.userAgent,
		os: navigator.platform,
	});

	const showToast = (message: string, type: "success" | "error") => {
		const toast = document.createElement("div");
		toast.className = `tif-toast ${type}`;
		toast.textContent = message;
		shadow.appendChild(toast);
		setTimeout(() => toast.remove(), 3000);
	};

	const openModal = () => {
		const ctx = getContextInfo();
		screenshotDataUrl = null;

		const overlay = document.createElement("div");
		overlay.className = "tif-overlay";

		overlay.innerHTML = `
      <div class="tif-modal">
        <div class="tif-header">
          <h2>Report a Bug</h2>
          <button class="tif-close" aria-label="Close">${CLOSE_ICON_SVG}</button>
        </div>
        <div class="tif-body">
          <div class="tif-field">
            <label for="tif-title">Title *</label>
            <input id="tif-title" type="text" placeholder="Brief description of the issue" maxlength="500" />
          </div>
          <div class="tif-field">
            <label for="tif-desc">Description *</label>
            <textarea id="tif-desc" placeholder="What happened? What did you expect to happen?" maxlength="10000"></textarea>
          </div>
          <div class="tif-field">
            <label for="tif-severity">Severity</label>
            <select id="tif-severity">
              <option value="low">Low</option>
              <option value="medium" selected>Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div class="tif-field">
            <label>Screenshot (optional)</label>
            <div class="tif-screenshot-zone" id="tif-screenshot">
              <span>Click to upload or paste from clipboard (Ctrl+V)</span>
              <input type="file" accept="image/*" />
            </div>
          </div>
          <details class="tif-context">
            <summary>Captured context</summary>
            <pre>${escapeHtml(JSON.stringify(ctx, null, 2))}</pre>
          </details>
        </div>
        <div class="tif-footer">
          <button class="tif-btn tif-btn-cancel">Cancel</button>
          <button class="tif-btn tif-btn-submit" id="tif-submit">Submit Report</button>
        </div>
      </div>
    `;

		shadow.appendChild(overlay);

		const close = () => overlay.remove();

		overlay.querySelector(".tif-close")?.addEventListener("click", close);
		overlay.querySelector(".tif-btn-cancel")?.addEventListener("click", close);
		overlay.addEventListener("click", (e) => {
			if (e.target === overlay) close();
		});

		const screenshotZone = overlay.querySelector(
			"#tif-screenshot",
		) as HTMLElement;
		const fileInput = screenshotZone.querySelector(
			'input[type="file"]',
		) as HTMLInputElement;

		const setScreenshot = async (dataUrl: string) => {
			try {
				screenshotDataUrl = await resizeScreenshot(dataUrl);
				screenshotZone.classList.add("has-image");
				const existingImg = screenshotZone.querySelector("img");
				if (existingImg) existingImg.remove();
				const img = document.createElement("img");
				img.src = screenshotDataUrl;
				screenshotZone.appendChild(img);
				const span = screenshotZone.querySelector("span");
				if (span) {
					span.textContent = "Screenshot attached. Click to change.";
				}
			} catch {
				showToast("Failed to process screenshot.", "error");
			}
		};

		screenshotZone.addEventListener("click", () => fileInput.click());

		fileInput.addEventListener("change", async () => {
			const file = fileInput.files?.[0];
			if (file) {
				const dataUrl = await readFileAsDataUrl(file);
				await setScreenshot(dataUrl);
			}
		});

		overlay.addEventListener("paste", async (e: Event) => {
			const clipboardEvent = e as ClipboardEvent;
			const items = clipboardEvent.clipboardData?.items;
			if (!items) return;
			for (const item of items) {
				if (item.type.startsWith("image/")) {
					const file = item.getAsFile();
					if (file) {
						const dataUrl = await readFileAsDataUrl(file);
						await setScreenshot(dataUrl);
					}
					break;
				}
			}
		});

		const submitBtn = overlay.querySelector("#tif-submit") as HTMLButtonElement;

		submitBtn.addEventListener("click", async () => {
			if (isSubmitting) return;

			try {
				const titleInput = overlay.querySelector(
					"#tif-title",
				) as HTMLInputElement | null;
				const descInput = overlay.querySelector(
					"#tif-desc",
				) as HTMLTextAreaElement | null;
				const severitySelect = overlay.querySelector(
					"#tif-severity",
				) as HTMLSelectElement | null;

				if (!titleInput || !descInput || !severitySelect) {
					showToast("Form elements not found.", "error");
					return;
				}

				const title = titleInput.value.trim();
				const description = descInput.value.trim();
				const severity = severitySelect.value;

				if (!title || !description) {
					showToast("Please fill in the title and description.", "error");
					return;
				}

				isSubmitting = true;
				submitBtn.disabled = true;
				submitBtn.textContent = "Submitting...";

				let user: { anonymousId: string; userId?: string };
				try {
					user = analytics.getUser();
				} catch {
					user = { anonymousId: "unknown" };
				}

				const payload = {
					title,
					description,
					severity,
					screenshot: screenshotDataUrl ?? undefined,
					metadata: ctx,
					anonymousId: user.anonymousId,
					userId: user.userId,
				};

				const analyticsConfig = analytics as unknown as {
					config?: { host?: string; apiKey?: string };
				};
				const apiHost =
					analyticsConfig.config?.host ?? "https://thisbefine.com";
				const apiKey = analyticsConfig.config?.apiKey ?? "";

				const response = await fetch(`${apiHost}/api/v1/bug-report`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-API-Key": apiKey,
					},
					body: JSON.stringify(payload),
				});

				if (response.ok) {
					close();
					showToast("Bug report submitted. Thank you!", "success");
				} else {
					showToast("Failed to submit. Please try again.", "error");
				}
			} catch {
				showToast("Something went wrong. Please try again.", "error");
			} finally {
				isSubmitting = false;
				submitBtn.disabled = false;
				submitBtn.textContent = "Submit Report";
			}
		});
	};

	fab.addEventListener("click", openModal);
	document.body.appendChild(host);

	return {
		destroy: () => {
			host.remove();
		},
	};
};
