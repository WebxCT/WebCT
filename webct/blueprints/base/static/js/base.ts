import { SlAlert } from "@shoelace-style/shoelace";

/**
 * Names of months. (Bit of a workaround, but saves importing multiple mb of javascript time utilities)
 */
export const MonthNames = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];

/**
 * Type of alerts for toasts.
 */
export enum AlertType {
	INFO = "primary",
	SUCCESS = "success",
	NEUTRAL = "neutral",
	WARNING = "warning",
	ERROR = "danger",
}

const AlertIcons = new Map<AlertType, string>([
	[AlertType.INFO, "info-circle"],
	[AlertType.SUCCESS, "check2-circle"],
	[AlertType.NEUTRAL, "gear"],
	[AlertType.WARNING, "exclamation-triangle"],
	[AlertType.ERROR, "exclamation-octagon"],
]);

/**
 * Display an alert to the user as a toast, appearing on the top-right of the
 * app.
 * @param message - Message to be displayed on the alert. Supports html.
 * @param type - Type of alert
 * @param duration - Duration of alert in seconds. Defaults to 20.
 * @returns A promise that is triggered once the alert is displayed.
 */
export function showAlert(message: string, type: AlertType, duration = 20): Promise<void> {
	const alert = Object.assign(document.createElement("sl-alert"), {
		variant: type,
		closable: true,
		duration: duration * 1000,
		innerHTML: `
			<sl-icon name="${AlertIcons.get(type)}" slot="icon"></sl-icon>
			${message}
			`
	});
	if (type == AlertType.ERROR || type == AlertType.WARNING) {
		// Additionally, dispatch an error event
		window.dispatchEvent(new CustomEvent("pageError", {
			bubbles: true,
			cancelable: false,
			composed: false,
		}));
	}
	document.body.append(alert);
	return (alert as SlAlert).toast();
}
