import * as faceapi from '@vladmandic/face-api';

const MODEL_URL = `${import.meta.env.BASE_URL}models`;
let modelsPromise: Promise<void> | null = null;

export type AnalisisRostro = { embedding: number[]; calidad: string };

export function cargarModelosFaciales() {
  if (!modelsPromise) {
    modelsPromise = (async () => {
      // Explicitly initialize a browser backend before loading/running any net.
      // Otherwise TensorFlow.js may select WASM while its async runtime is not ready.
      const tfRuntime = faceapi.tf as unknown as {
        setBackend: (name: 'webgl' | 'cpu') => Promise<boolean>;
        ready: () => Promise<void>;
      };
      let backendReady = false;
      try { backendReady = await tfRuntime.setBackend('webgl'); } catch { /* try CPU below */ }
      if (!backendReady) {
        backendReady = await tfRuntime.setBackend('cpu');
      }
      if (!backendReady) throw new Error('No se pudo iniciar el motor de reconocimiento facial en este navegador.');
      await tfRuntime.ready();
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
    })().catch((error) => {
      modelsPromise = null;
      throw error;
    });
  }
  return modelsPromise;
}

export async function analizarRostro(video: HTMLVideoElement): Promise<AnalisisRostro> {
  await cargarModelosFaciales();
  if (!video.videoWidth || !video.videoHeight) throw new Error('Espera a que la cámara enfoque tu rostro.');
  const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.55 }))
    .withFaceLandmarks().withFaceDescriptors();
  if (detections.length !== 1) throw new Error(detections.length ? 'Debe aparecer una sola persona en cámara.' : 'No detectamos un rostro. Centra la cara y mejora la iluminación.');
  const face = detections[0];
  if (face.detection.score < 0.7) throw new Error('La imagen está poco clara. Mira de frente y vuelve a intentarlo.');
  if (face.detection.box.width < video.videoWidth * 0.2 || face.detection.box.height < video.videoHeight * 0.25) {
    throw new Error('Acércate un poco a la cámara para que el rostro salga completo.');
  }
  const box = face.detection.box;
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 64;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('No se pudo revisar la iluminación de la foto.');
  context.drawImage(video, box.x, box.y, box.width, box.height, 0, 0, 64, 64);
  const pixels = context.getImageData(0, 0, 64, 64).data;
  let brightness = 0;
  for (let i = 0; i < pixels.length; i += 4) brightness += (pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114);
  brightness /= pixels.length / 4;
  if (brightness < 45) throw new Error('Hay poca luz en tu rostro. Enciende una luz y vuelve a intentarlo.');
  if (brightness > 220) throw new Error('La luz está muy fuerte. Evita apuntar la cámara hacia una ventana.');
  return { embedding: Array.from(face.descriptor), calidad: 'Rostro detectado, centrado e iluminación adecuada.' };
}

export async function capturarJpeg(video: HTMLVideoElement): Promise<Blob> {
  const scale = Math.min(1, 640 / video.videoWidth);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo preparar la foto.');
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
  if (!blob) throw new Error('No se pudo capturar la foto.');
  return blob;
}
