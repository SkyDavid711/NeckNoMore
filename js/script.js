import {
    PoseLandmarker,
    FilesetResolver,
    DrawingUtils
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";

import { checkUpperTrapezius } from "./checkUpperTrapezius.js";

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const videoWrapper = document.getElementById("videoWrapper");
const countdownElement = document.getElementById("countdown");
const poseCountElement = document.getElementById("poseCount");
const poseDetail = document.getElementById("pose-detail");

let poseLandmarker;
let running = false;

// ---- State ----
let state = {
    selectedPose: null,
    isPoseDetectionActive: false,
    poseTimer: 0,
    wrongPoseTimer: 0,
    poseSuccess: false,
    poseCount: 0
};

const elements = { videoWrapper, countdownElement, poseCountElement };

// ---- Event for selecting pose ----
document.querySelectorAll(".pose-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        state.selectedPose = btn.dataset.pose;
        showPoseDetail(state.selectedPose);
    });
});

function showPoseDetail(pose) {
    let html = "";
    if (pose === "upper") {
        html = `
          <h3>Upper Trapezius Stretch</h3>
          <img src="/images/upper_trapezius.png" alt="Upper Trapezius" style="max-width:200px;" />
          <ol>
            <li>Start with proper posture. Sit or stand tall...</li>
            <li>Gently tilt your head to one side...</li>
            <li>Use your hand for deeper stretch (optional)...</li>
            <li>Hold for 20-30 seconds...</li>
          </ol>
          <button id="startBtn" class="pose-btn red">START!</button>
        `;
    } else if (pose === "shoulder") {
        html = `<h3>Shoulder Squeezes</h3><p>...</p><button id="startBtn" class="pose-btn red">START!</button>`;
    } else if (pose === "levator") {
        html = `<h3>Levator Scapula Stretch</h3><p>...</p><button id="startBtn" class="pose-btn red">START!</button>`;
    }
    poseDetail.innerHTML = html;
    document.getElementById("startBtn").addEventListener("click", startPoseCheck);
}

function startPoseCheck() {
    state.poseTimer = 0;
    state.wrongPoseTimer = 0;
    state.poseSuccess = false;
    state.isPoseDetectionActive = true;

    videoWrapper.classList.remove("green-border");
    videoWrapper.classList.add("red-border");

    countdownElement.textContent = 10;
    countdownElement.style.display = "block";
}

// ===== Mediapipe Init =====
async function init() {
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
            delegate: "GPU"
        },
        runningMode: "VIDEO",
        numPoses: 1
    });

    startVideo();
}

function startVideo() {
    navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
        video.srcObject = stream;
        video.onloadedmetadata = () => {
            video.play();
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            running = true;
            requestAnimationFrame(loop);
        };
    });
}

const draw = new DrawingUtils(ctx);

function loop() {
    if (!running) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (state.isPoseDetectionActive) {
        const result = poseLandmarker.detectForVideo(video, performance.now());

        if (result.landmarks.length > 0) {
            const landmarks = result.landmarks[0];
            draw.drawLandmarks(landmarks, { color: "red", radius: 4 });
            draw.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, { color: "green", lineWidth: 2 });

            if (state.selectedPose === "upper") {
                checkUpperTrapezius(landmarks, state, elements);
            }
        }
    }

    requestAnimationFrame(loop);
}

init();
