import React from "react";

/**
 * PUBLIC_INTERFACE
 * Modal overlay to display a 360° Virtual Tour (as iframe/embed/panorama) or AR Preview (AR.js marker).
 *
 * Props:
 *   - open: (bool) whether modal is visible
 *   - onClose: function to close the modal
 *   - tourUrl: 360° tour URL (string) or null
 *   - arMedia: {arMarkerUrl: string, arModelUrl: string} | null
 */
function VirtualTourARModal({ open, onClose, tourUrl, arMedia }) {
  if (!open) return null;

  // Prefer 360 Tour if both are available.
  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(50,60,60,0.34)",
        zIndex: 9992,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn .22s",
      }}
      aria-modal="true"
      role="dialog"
    >
      <style>
        {`@keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }`}
      </style>
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          minWidth: 360,
          minHeight: 320,
          maxWidth: "98vw",
          maxHeight: "94vh",
          padding: 0,
          boxShadow: "0 7px 30px rgba(129,178,154,.22), 0 0 0 1px #ececd9",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <button
          aria-label="Close virtual tour"
          onClick={onClose}
          style={{
            position: "absolute",
            top: 14,
            right: 15,
            background: "none",
            border: "none",
            fontSize: 28,
            color: "#7fa08f",
            cursor: "pointer",
            zIndex: 20,
            opacity: 0.8,
            fontWeight: 700,
          }}
          title="Close"
        >
          ×
        </button>
        <h3 style={{
          margin: "24px 0 14px 0",
          textAlign: "center",
          color: "#81b29a",
          fontWeight: 800,
          fontSize: 23,
          letterSpacing: 0.09,
          userSelect: "none",
        }}>
          {tourUrl ? "360° Virtual Tour" : (!tourUrl && arMedia ? "AR Preview" : "Preview")}
        </h3>
        <div style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 270,
          padding: 18,
          background: "#fafcff"
        }}>
          {tourUrl && (
            <iframe
              src={tourUrl}
              width="430"
              height="300"
              style={{ border: "2px solid #b38632", borderRadius: 12, maxWidth: "92vw", maxHeight: "58vh", background: "#000" }}
              allow="xr-spatial-tracking; gyroscope; accelerometer; fullscreen"
              loading="lazy"
              title="360 Tour"
            />
          )}
          {!tourUrl && arMedia && arMedia.arModelUrl && (
            // Simple AR.js embed
            <iframe
              srcDoc={`
                <!DOCTYPE html>
                <html>
                <head>
                    <script src="https://cdn.jsdelivr.net/npm/aframe@1.2.0/dist/aframe.min.js"></script>
                    <script src="https://cdn.jsdelivr.net/npm/ar.js@3.3.2/aframe/build/aframe-ar.js"></script>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
                    <style>body,html{margin:0;padding:0;overflow:hidden;height:100%;}</style>
                </head>
                <body style="margin:0;">
                  <a-scene embedded arjs="sourceType: webcam;">
                    <a-marker type="pattern" url="${arMedia.arMarkerUrl}">
                      <a-entity
                        gltf-model="${arMedia.arModelUrl}"
                        scale="0.8 0.8 0.8"
                        rotation="0 90 0"
                        position="0 0 0"
                      ></a-entity>
                    </a-marker>
                    <a-entity camera></a-entity>
                  </a-scene>
                </body>
                </html>
              `}
              width="420"
              height="320"
              style={{
                border: "2px solid #81b29a", borderRadius: 10, background: "#000", maxWidth: "92vw", maxHeight: "58vh"
              }}
              title="AR.js Preview"
            />
          )}
          {!tourUrl && (!arMedia || !arMedia.arModelUrl) && (
            <div style={{ color: "#bb5d2d", fontSize: 17, textAlign: "center" }}>
              No 360° tour or AR preview available.
            </div>
          )}
        </div>
        <div style={{ padding: "6px 24px 16px 24px", textAlign: "center", fontSize: 14, color: "#888" }}>
          For AR: Point your camera at the marker (provided by agent/builder) to view in 3D.
        </div>
      </div>
    </div>
  );
}

export default VirtualTourARModal;
