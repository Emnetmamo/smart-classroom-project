// Real facial recognition using @vladmandic/face-api (TensorFlow.js).
// Client-only: face-api is dynamically imported inside functions so this
// module is safe to include in the SSR bundle.
import type * as FaceApi from "@vladmandic/face-api";
import type { FaceMatcher } from "@vladmandic/face-api";

const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

let faceapi: typeof FaceApi | null = null;
let modelsLoaded = false;
let loadingPromise: Promise<typeof FaceApi> | null = null;

async function getFaceApi(): Promise<typeof FaceApi> {
  if (faceapi && modelsLoaded) return faceapi;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    const lib = await import("@vladmandic/face-api");
    await lib.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await lib.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    await lib.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    faceapi = lib;
    modelsLoaded = true;
    return lib;
  })();
  return loadingPromise;
}

function detectorOptions(lib: typeof FaceApi) {
  return new lib.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 });
}

export type KnownPerson = {
  label: string; // person id
  name: string;
  imageUrl: string;
};

export type LiveMatch = {
  box: { x: number; y: number; width: number; height: number };
  label: string; // person id or "unknown"
  distance: number;
};

// Build a FaceMatcher from reference portrait images.
export async function buildMatcher(
  people: KnownPerson[],
  threshold = 0.5,
): Promise<{ matcher: FaceMatcher; failed: string[] }> {
  const lib = await getFaceApi();
  const opts = detectorOptions(lib);
  const labeled: FaceApi.LabeledFaceDescriptors[] = [];
  const failed: string[] = [];

  for (const p of people) {
    try {
      const img = await lib.fetchImage(p.imageUrl);
      const det = await lib
        .detectSingleFace(img, opts)
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (det) {
        labeled.push(new lib.LabeledFaceDescriptors(p.label, [det.descriptor]));
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
  return { matcher: new lib.FaceMatcher(labeled, threshold), failed };
}

// Detect all faces in the current video frame and match against known people.
export async function detectAndMatch(
  video: HTMLVideoElement,
  matcher: FaceMatcher,
): Promise<LiveMatch[]> {
  const lib = await getFaceApi();
  const opts = detectorOptions(lib);
  const results = await lib
    .detectAllFaces(video, opts)
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
