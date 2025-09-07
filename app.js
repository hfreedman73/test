const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let model;
let score = 0;
const scoreElement = document.getElementById('score');
const progressElement = document.getElementById('progress');
let shavingProgress = 0;
const shavingTime = 5; // in seconds
let startTime = null;

async function setupWebcam() {
  return new Promise((resolve, reject) => {
    const constraints = {
      video: true,
    };

    navigator.mediaDevices.getUserMedia(constraints)
      .then((stream) => {
        video.srcObject = stream;
        video.addEventListener('loadeddata', () => {
          resolve();
        });
      })
      .catch((err) => {
        reject(err);
      });
  });
}

async function loadModel() {
    model = await faceLandmarksDetection.load(
        faceLandmarksDetection.SupportedPackages.mediapipeFacemesh,
        {
            shouldLoadIrisModel: false,
            maxFaces: 1,
            maxContinuousChecks: 2,
            detectionConfidence: 0.95,
            iouThreshold: 0.95,
            scoreThreshold: 0.95,
        }
    );
}

async function render() {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const predictions = await model.estimateFaces({
        input: video,
        predictIrises: false,
    });

    if (predictions.length > 0) {
        const keypoints = predictions[0].scaledMesh;
        drawNoBeard(keypoints);

        if (startTime === null) {
            startTime = new Date();
        }

        const now = new Date();
        const elapsedTime = (now - startTime) / 1000;
        shavingProgress = (elapsedTime / shavingTime) * 100;
        progressElement.style.width = `${shavingProgress}%`;

        if (shavingProgress >= 100) {
            score = elapsedTime;
            scoreElement.innerText = `Score: ${score.toFixed(2)}s`;
            startTime = null;
            shavingProgress = 0;
        }

    } else {
        startTime = null;
        shavingProgress = 0;
        progressElement.style.width = '0%';
    }

    requestAnimationFrame(render);
}

function drawNoBeard(keypoints) {
    const beardKeypoints = [
        10, 108, 69, 104, 52, 53, 46, 10,
        205, 206, 211, 210, 212, 432, 430, 431, 426, 425,
        351, 345, 346, 347, 447, 348, 349, 350, 352,
        123, 121, 117, 118, 119, 120,
        58, 62, 61, 38, 37, 36, 0, 11, 12, 13, 14, 15, 16,
        152, 148, 149, 150, 176, 172,
        215, 213, 214, 185,
    ];

    const foreheadKeypoint = keypoints[10];
    const cheekKeypoint = keypoints[117];

    const skinColor1 = ctx.getImageData(foreheadKeypoint[0], foreheadKeypoint[1], 1, 1).data;
    const skinColor2 = ctx.getImageData(cheekKeypoint[0], cheekKeypoint[1], 1, 1).data;

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `rgb(${skinColor1[0]}, ${skinColor1[1]}, ${skinColor1[2]})`);
    gradient.addColorStop(1, `rgb(${skinColor2[0]}, ${skinColor2[1]}, ${skinColor2[2]})`);

    ctx.fillStyle = gradient;

    ctx.beginPath();
    ctx.moveTo(keypoints[beardKeypoints[0]][0], keypoints[beardKeypoints[0]][1]);
    for (let i = 1; i < beardKeypoints.length; i++) {
        const [x, y, z] = keypoints[beardKeypoints[i]];
        ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
}

async function main() {
  await setupWebcam();
  await loadModel();
  render();
}

main();
