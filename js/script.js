import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";

import { checkUpperTrapezius } from "./checkUpperTrapezius.js";
import { checkChinTucks } from "./checkChinTucks.js";
import { checkLevatorScapula } from "./checkLevatorScapula.js";
import { checkNeckRotation } from "./checkNeckRotation.js";

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const videoWrapper = document.getElementById("videoWrapper");
const countdownElement = document.getElementById("countdown");
const poseCountElement = document.getElementById("poseCount");
const poseDetail = document.getElementById("pose-detail");

let poseLandmarker;
let running = false;
let draw;

// ---- State กลางของแอป ----
const state = {
  selectedPose: null,
  isPoseDetectionActive: false,
  poseTimer: 0,
  wrongPoseTimer: 0,
  poseCount: 0,

  // สำหรับ Chin Tucks (คาลิเบรต z-axis)
  chin: {
    baselineNoseZ: null,
    baselineCount: 0,
    calibrating: false
  }
};

const elements = { videoWrapper, countdownElement, poseCountElement };

// เก็บ reference ปุ่มที่สร้างแบบ dynamic เพื่อสลับ START/STOP
let startStopBtn = null;

// ---- เลือกท่าออกกำลัง ----
document.querySelectorAll(".pose-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    state.selectedPose = btn.dataset.pose;
    renderPoseDetail(state.selectedPose);
  });
});

function renderPoseDetail(pose) {
  let html = "";
  if (pose === "upper") {
    html = `
      <h3>Upper Trapezius Stretch</h3>
      <img src="/images/upper_trapezius.png" alt="Upper Trapezius" style="max-width:200px;" />
      <ol>
        <li>นั่ง/ยืนหลังตรง</li>
        <li>ค่อยๆ เอียงศีรษะไปด้านข้าง ให้หูเข้าใกล้ไหล่</li>
        <li>(ทางเลือก) ใช้มือกดเบาๆ เพิ่มการยืด</li>
        <li>ค้าง 20–30 วินาที แล้วสลับข้าง</li>
      </ol>
      <button id="startBtn" class="pose-btn start-green">START</button>
    `;
  } else if (pose === "chin") {
    html = `
      <h3>Chin Tucks</h3>
      <ol>
        <li>นั่ง/ยืนหลังตรง จ้องมองตรง</li>
        <li>ดึงคางถอยหลัง (คอยืดตรง) ไม่ก้ม/เงยศีรษะ</li>
        <li>ค้างไว้ตามเวลา แล้วผ่อนคลาย</li>
      </ol>
      <p style="opacity:.75">เริ่มต้นจะคาลิเบรตตำแหน่งศีรษะสั้นๆ อัตโนมัติ</p>
      <button id="startBtn" class="pose-btn start-green">START</button>
    `;
  } else if (pose === "levator") {
    html = `
      <h3>Levator Scapula Stretch</h3>
      <ol>
        <li>นั่ง/ยืนหลังตรง ไหล่ผ่อนคลาย</li>
        <li>หมุนหน้าไปด้านซ้าย/ขวาเล็กน้อย (มองไปใต้มุมรักแร้ฝั่งตรงข้าม)</li>
        <li>ก้มศีรษะลงเล็กน้อย และเอียงศีรษะตาม</li>
        <li>(ทางเลือก) ใช้มือช่วยดึงศีรษะเฉียงลงเบา ๆ</li>
      </ol>
      <button id="startBtn" class="pose-btn start-green">START</button>
    `;
  } else if (pose === "neck") {
    html = `
        <h3>Neck Rotation</h3>
        <ol>
        <li>นั่ง/ยืนหลังตรง มองตรงก่อนเริ่ม</li>
        <li>หมุนหน้าไปทางซ้ายหรือขวาให้รู้สึกยืดที่คอ (ไม่ก้ม/เงย)</li>
        <li>ค้างตามเวลา แล้วผ่อนคลาย</li>
        </ol>
        <button id="startBtn" class="pose-btn start-green">START</button>
    `;
  } else {
    html = `<h3>Select a posture above</h3>`;
  }

  poseDetail.innerHTML = html;
  startStopBtn = document.getElementById("startBtn");
  if (startStopBtn) {
    startStopBtn.addEventListener("click", onStartClicked, { once: true });
  }
}

// ---- START / STOP ----
function onStartClicked() {
  startPoseCheck();
  // เปลี่ยนปุ่มเป็น STOP
  if (startStopBtn) {
    startStopBtn.textContent = "STOP";
    startStopBtn.classList.remove("start-green");
    startStopBtn.classList.add("stop-red");    
    startStopBtn.addEventListener("click", onStopClicked, { once: true });
  }
}

function onStopClicked() {
  stopPoseCheck();
  // เปลี่ยนปุ่มกลับเป็น START
  if (startStopBtn) {
    startStopBtn.textContent = "START";
    startStopBtn.classList.remove("stop-red");
    startStopBtn.classList.add("start-green");
    startStopBtn.addEventListener("click", onStartClicked, { once: true });
  }
}

function startPoseCheck() {
  state.isPoseDetectionActive = true;
  state.poseTimer = 0;
  state.wrongPoseTimer = 0;

  // ตั้งค่าเริ่มต้นสำหรับ Chin Tucks
  if (state.selectedPose === "chin") {
    state.chin.baselineNoseZ = null;
    state.chin.baselineCount = 0;
    state.chin.calibrating = true;
  }

  // ไม่รีเซ็ต poseCount ที่นี่ เพื่อให้นับต่อเนื่องหลัง START
  videoWrapper.classList.remove("green-border");
  videoWrapper.classList.add("red-border");

  countdownElement.style.display = "block";
  countdownElement.textContent = 10;
}

function stopPoseCheck() {
  // หยุดและรีเซ็ตทุกอย่างตามที่ขอ
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
      draw = new DrawingUtils(ctx);
      requestAnimationFrame(loop);
    };
  });
}

function loop() {
  if (!running) return;

  // แสดงภาพจากกล้องตลอด
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  //ctx.save();
  // ถ้าคุณตั้งให้ mirror ด้วย CSS อยู่แล้ว ไม่ต้อง scale(-1,1)
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  if (state.isPoseDetectionActive) {
    const result = poseLandmarker.detectForVideo(video, performance.now());
    if (result.landmarks.length > 0) {
      const landmarks = result.landmarks[0];

      // วาดโครงกระดูก
      draw.drawLandmarks(landmarks, { color: "red", radius: 4 });
      draw.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
        color: "green", lineWidth: 2
      });

      // ตรวจเฉพาะท่าที่เลือก
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

  ctx.restore();
  requestAnimationFrame(loop);
}

init();
