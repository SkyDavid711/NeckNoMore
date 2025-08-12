import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";

import { checkUpperTrapezius } from "./checkUpperTrapezius.js";
import { checkChinTucks } from "./checkChinTucks.js";
import { checkLevatorScapula } from "./checkLevatorScapula.js";
import { checkNeckRotation } from "./checkNeckRotation.js";

/* ---------- DOM ---------- */
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const videoWrapper = document.getElementById("videoWrapper");
const countdownElement = document.getElementById("countdown");
const poseCountElement = document.getElementById("poseCount");
const poseDetail = document.getElementById("pose-detail");

/* Mobile UI */
const mobileMenu = document.getElementById("mobileMenu");
const mobileSheet = document.getElementById("mobileSheet");
const mobileSheetClose = document.getElementById("mobileSheetClose");
const mobilePoseDetail = document.getElementById("mobilePoseDetail");

/* ---------- App State ---------- */
let poseLandmarker;
let running = false;
let draw;

const state = {
  selectedPose: null,          // 'upper' | 'chin' | 'levator' | 'neck'
  isPoseDetectionActive: false,
  poseTimer: 0,
  wrongPoseTimer: 0,
  poseCount: 0,

  // Chin-tucks calibration
  chin: {
    baselineNoseZ: null,
    baselineCount: 0,
    calibrating: false
  }
};

const elements = { videoWrapper, countdownElement, poseCountElement };
let startStopBtn = null;

/* ---------- Desktop: pose buttons ---------- */
document.querySelectorAll(".pose-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    if (state.isPoseDetectionActive) stopPoseCheck();  // safety
    state.selectedPose = btn.dataset.pose;
    renderPoseDetailDesktop(state.selectedPose);
  });
});

/* ---------- Mobile: bottom menu buttons ---------- */
document.querySelectorAll(".mobile-pose-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    if (state.isPoseDetectionActive) stopPoseCheck();  // safety
    state.selectedPose = btn.dataset.pose;
    openMobileSheet(state.selectedPose);
  });
});

if (mobileSheetClose) {
  mobileSheetClose.addEventListener("click", closeMobileSheet);
}

/* ---------- Desktop panel render ---------- */
function renderPoseDetailDesktop(pose) {
  let html = "";
  if (pose === "upper") {
    html = `
      <h3>Upper Trapezius Stretch</h3>
      <ol>
        <li>นั่ง/ยืนหลังตรง</li>
        <li>เอียงศีรษะไปด้านข้างให้หูเข้าใกล้ไหล่</li>
        <li>(ทางเลือก) ใช้มือช่วยดึงเบา ๆ</li>
        <li>ค้าง 20–30 วินาที แล้วสลับข้าง</li>
      </ol>
      <button id="startBtn" class="pose-btn start-green">START</button>
    `;
  } else if (pose === "chin") {
    html = `
      <h3>Chin Tucks</h3>
      <ol>
        <li>นั่ง/ยืนหลังตรง มองตรง</li>
        <li>ดึงคางถอยหลัง (ไม่ก้ม/เงย)</li>
        <li>ค้างตามเวลา แล้วผ่อนคลาย</li>
      </ol>
      <p style="opacity:.75">เริ่มต้นจะคาลิเบรตตำแหน่งศีรษะสั้นๆ อัตโนมัติ</p>
      <button id="startBtn" class="pose-btn start-green">START</button>
    `;
  } else if (pose === "levator") {
    html = `
      <h3>Levator Scapula Stretch</h3>
      <ol>
        <li>นั่ง/ยืนหลังตรง ไหล่ผ่อนคลาย</li>
        <li>หมุนหน้าเล็กน้อย มองลงเฉียงไปใต้มุมรักแร้</li>
        <li>ก้มลงเล็กน้อย และเอียงศีรษะตาม</li>
        <li>(ทางเลือก) ใช้มือช่วยดึงเบา ๆ</li>
      </ol>
      <button id="startBtn" class="pose-btn start-green">START</button>
    `;
  } else if (pose === "neck") {
    html = `
      <h3>Neck Rotation</h3>
      <ol>
        <li>นั่ง/ยืนหลังตรง มองตรง</li>
        <li>หมุนหน้าไปซ้ายหรือขวา (ไม่ก้ม/เงย)</li>
        <li>ค้างตามเวลา แล้วผ่อนคลาย</li>
      </ol>
      <button id="startBtn" class="pose-btn start-green">START</button>
    `;
  } else {
    html = `<h3>Select a posture above</h3>`;
  }

  poseDetail.innerHTML = html;
  startStopBtn = document.getElementById("startBtn");
  if (startStopBtn) startStopBtn.addEventListener("click", onStartClickedDesktop, { once: true });
}

/* ---------- Mobile bottom sheet ---------- */
function openMobileSheet(pose) {
  document.body.style.overflow = "hidden";
  mobileSheet.setAttribute("aria-hidden", "false");
  mobileSheet.classList.add("open");
  renderPoseDetailMobile(pose);
}

function closeMobileSheet() {
  document.body.style.overflow = "";
  mobileSheet.setAttribute("aria-hidden", "true");
  mobileSheet.classList.remove("open");
  mobilePoseDetail.innerHTML = "";
}

/* ✅ เดเลเกต: กดปุ่ม × หรือแตะพื้นหลัง (โปร่งใส) เพื่อปิด */
mobileSheet.addEventListener("click", (e) => {
  const onCloseBtn = e.target.closest(".mobile-sheet__close");
  const onBackdrop = e.target === mobileSheet;
  if (onCloseBtn || onBackdrop) closeMobileSheet();
});

function renderPoseDetailMobile(pose) {
  let html = "";
  if (pose === "upper") {
    html = `
      <button class="mobile-sheet__close" aria-label="Close">×</button>
      <div class="mobile-sheet__content">
        <h3 style="margin:6px 0 8px">Upper Trapezius Stretch</h3>
        <ul style="margin:0 0 12px 18px">
          <li>เอียงศีรษะไปด้านข้างให้หูเข้าใกล้ไหล่</li>
          <li>(ทางเลือก) ใช้มือช่วยดึงเบา ๆ</li>
        </ul>
        <button id="startBtnMobile" class="pose-btn start-green" style="padding:8px 14px">START</button>
      </div>
    `;
  } else if (pose === "chin") {
    html = `
      <button class="mobile-sheet__close" aria-label="Close">×</button>
      <div class="mobile-sheet__content">
        <h3 style="margin:6px 0 8px">Chin Tucks</h3>
        <ul style="margin:0 0 12px 18px">
          <li>ดึงคางถอยหลัง (ไม่ก้ม/เงย)</li>
        </ul>
        <button id="startBtnMobile" class="pose-btn start-green" style="padding:8px 14px">START</button>
      </div>
    `;
  } else if (pose === "levator") {
    html = `
      <button class="mobile-sheet__close" aria-label="Close">×</button>
      <div class="mobile-sheet__content">
        <h3 style="margin:6px 0 8px">Levator Scapula Stretch</h3>
        <ul style="margin:0 0 12px 18px">
          <li>หมุนหน้าเล็กน้อย มองลงเฉียง</li>
          <li>ก้มลงเล็กน้อย และเอียงศีรษะตาม</li>
        </ul>
        <button id="startBtnMobile" class="pose-btn start-green" style="padding:8px 14px">START</button>
      </div>
    `;
  } else if (pose === "neck") {
    html = `
      <button class="mobile-sheet__close" aria-label="Close">×</button>
      <div class="mobile-sheet__content">
        <h3 style="margin:6px 0 8px">Neck Rotation</h3>
        <ul style="margin:0 0 12px 18px">
          <li>หมุนหน้าไปซ้ายหรือขวา โดยไม่ก้ม/เงย</li>
        </ul>
        <button id="startBtnMobile" class="pose-btn start-green" style="padding:8px 14px">START</button>
      </div>
    `;
  }

  mobilePoseDetail.innerHTML = html;

  // bind close + start/stop
  startStopBtn = document.getElementById("startBtnMobile");
  if (startStopBtn) startStopBtn.addEventListener("click", onStartClickedMobile, { once: true });
}

/* ---------- START/STOP (Desktop) ---------- */
function onStartClickedDesktop() {
  startPoseCheck();
  if (startStopBtn) {
    startStopBtn.textContent = "STOP";
    startStopBtn.classList.remove("start-green");
    startStopBtn.classList.add("stop-red");
    startStopBtn.addEventListener("click", onStopClickedDesktop, { once: true });
  }
}
function onStopClickedDesktop() {
  stopPoseCheck();
  if (startStopBtn) {
    startStopBtn.textContent = "START";
    startStopBtn.classList.remove("stop-red");
    startStopBtn.classList.add("start-green");
    startStopBtn.addEventListener("click", onStartClickedDesktop, { once: true });
  }
}

/* ---------- START/STOP (Mobile sheet) ---------- */
function onStartClickedMobile() {
  startPoseCheck();
  if (startStopBtn) {
    startStopBtn.textContent = "STOP";
    startStopBtn.classList.remove("start-green");
    startStopBtn.classList.add("stop-red");
    startStopBtn.addEventListener("click", onStopClickedMobile, { once: true });
  }
}
function onStopClickedMobile() {
  stopPoseCheck();
  if (startStopBtn) {
    startStopBtn.textContent = "START";
    startStopBtn.classList.remove("stop-red");
    startStopBtn.classList.add("start-green");
    startStopBtn.addEventListener("click", onStartClickedMobile, { once: true });
  }
}

/* ---------- Core START/STOP ---------- */
function startPoseCheck() {
  state.isPoseDetectionActive = true;
  state.poseTimer = 0;
  state.wrongPoseTimer = 0;

  if (state.selectedPose === "chin") {
    state.chin.baselineNoseZ = null;
    state.chin.baselineCount = 0;
    state.chin.calibrating = true;
  }

  videoWrapper.classList.remove("green-border");
  videoWrapper.classList.add("red-border");

  countdownElement.style.display = "block";
  countdownElement.textContent = 10;
}

function stopPoseCheck() {
  state.isPoseDetectionActive = false;
  state.poseTimer = 0;
  state.wrongPoseTimer = 0;
  state.poseCount = 0;

  state.chin.baselineNoseZ = null;
  state.chin.baselineCount = 0;
  state.chin.calibrating = false;

  poseCountElement.textContent = 0;
  countdownElement.textContent = 10;
  videoWrapper.classList.remove("red-border", "green-border");

  // ถ้าเปิด bottom sheet อยู่ ให้ค้างไว้หรือปิดก็ได้
  // closeMobileSheet();
}

/* ---------- Mediapipe Init & Loop ---------- */
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
      draw = new DrawingUtils(ctx);
      requestAnimationFrame(loop);
    };
  });
}

function loop() {
  if (!running) return;

  // วาดภาพกล้องตลอดเวลา
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  if (state.isPoseDetectionActive) {
    const result = poseLandmarker.detectForVideo(video, performance.now());
    if (result.landmarks.length > 0) {
      const landmarks = result.landmarks[0];

      // วาดโครงร่างผู้ใช้
      draw.drawLandmarks(landmarks, { color: "red", radius: 4 });
      draw.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, { color: "green", lineWidth: 2 });

      // เรียกตรวจแต่ละท่า
      if (state.selectedPose === "upper") {
        checkUpperTrapezius(landmarks, state, elements);
      } else if (state.selectedPose === "chin") {
        checkChinTucks(landmarks, state, elements);
      } else if (state.selectedPose === "levator") {
        checkLevatorScapula(landmarks, state, elements);
      } else if (state.selectedPose === "neck") {
        checkNeckRotation(landmarks, state, elements);
      }
    }
  }

  requestAnimationFrame(loop);
}

init();
