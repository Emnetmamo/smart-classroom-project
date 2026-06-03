// Real facial recognition using @vladmandic/face-api (TensorFlow.js).
// Client-only module — never import from server/SSR code.
import * as faceapi from "@vladmandic/face-api";

const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;

export async function loadModels(): Promise<void> {
  if (modelsLoaded) return;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    modelsLoaded = true;
  })();
  return loadingPromise;
}

export type KnownPerson = {
  label: string; // person id
  name: string;
  imageUrl: string;
};

const detectorOptions = new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 });

// Build a FaceMatcher from reference portrait images.
export async function buildMatcher(
  people: KnownPerson[],
  threshold = 0.5,
): Promise<{ matcher: faceapi.FaceMatcher; failed: string[] }> {
  await loadModels();
  const labeled: faceapi.LabeledFaceDescriptors[] = [];
  const failed: string[] = [];

  for (const p of people) {
    try {
      const img = await faceapi.fetchImage(p.imageUrl);
      const det = await faceapi
        .detectSingleFace(img, detectorOptions)
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (det) {
        labeled.push(new faceapi.LabeledFaceDescriptors(p.label, [det.descriptor]));
      } else {
        failed.push(p.name);
      }
    } catch {
      failed.push(p.name);
    }
  }

  if (labeled.length === 0) {
    throw new Error("No reference faces could be encoded");
  }
  return { matcher: new faceapi.FaceMatcher(labeled, threshold), failed };
}

export type LiveMatch = {
  box: { x: number; y: number; width: number; height: number };
  label: string; // person id or "unknown"
  distance: number;
};

// Detect all faces in the current video frame and match against known people.
export async function detectAndMatch(
  video: HTMLVideoElement,
  matcher: faceapi.FaceMatcher,
): Promise<LiveMatch[]> {
  const results = await faceapi
    .detectAllFaces(video, detectorOptions)
    .withFaceLandmarks()
    .withFaceDescriptors();

  return results.map((r) => {
    const best = matcher.findBestMatch(r.descriptor);
    const { x, y, width, height } = r.detection.box;
    return {
      box: { x, y, width, height },
      label: best.label,
      distance: best.distance,
    };
  });
}
