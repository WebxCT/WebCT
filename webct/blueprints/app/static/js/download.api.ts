const Endpoint = {
	putPrepare: "sim/download/prep",
	getDownload: "sim/download/",
	getStatus: "sim/download/status"
};

export enum DownloadFormat {
	TIFF_STACK = "TIFF_STACK",
	TIFF_ZIP = "TIFF_ZIP",
	NUMPY = "NUMPY",
	JPEG = "JPEG",
}

export enum DownloadFormatNames {
	"TIFF_STACK" = "TIFF Hyperstack",
	"TIFF_ZIP" = "TIFF Zipped Folder",
	"NUMPY" = "Numpy Array Object",
	"JPEG" = "JPEG Image",
}

export enum DownloadResource {
	PROJECTION = "PROJECTION",
	ALL_PROJECTION = "ALL_PROJECTIONS",
	RECON_SLICE = "RECON_SLICE",
	RECONSTRUCTION = "RECON",
}

export enum DownloadStatus {
	WAITING = "WAITING",
	SIMULATING = "SIMULATING",
	PACKAGING = "PACKAGING",
	DONE = "DONE",
	ERROR = "ERROR",
}

export interface DownloadRequest {
	format: DownloadFormat
	resource: DownloadResource
}

export async function sendPrepare(data:DownloadRequest): Promise<Response> {
	return await fetch(Endpoint.putPrepare, {
		method: "PUT",
		body: JSON.stringify(data),
		headers: {
			"Content-Type":"application/json"
		}
	});
}

export async function requestStatus(): Promise<Response> {
	return await fetch(Endpoint.getStatus);
}

export function downloadEndpoint(data:DownloadRequest): string {
	return Endpoint.getDownload+"?resource="+data.resource+"&format="+data.format;
}

export function startDownload(data:DownloadRequest):void {
	const fakeA = document.createElement("a");
	fakeA.href = downloadEndpoint(data);
	fakeA.download = "filename.zip";
	fakeA.click();
}
