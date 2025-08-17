// /js/checkChinTucks.js
// เงื่อนไข: ต้อง "ถอยคางเล็กน้อย" + "มีนิ้วอยู่บริเวณคาง" + ศีรษะ/ไหล่ไม่เอียงมาก
// handLandmarks: array ของมือจาก MediaPipe Hands (อาจว่างได้)
export function checkChinTucks(landmarks, state, elements, handLandmarks = []) {
  const { videoWrapper, countdownElement, poseCountElement } = elements;

  // -------- Pose indices (MediaPipe Pose) --------
  const NOSE = 0, LEFT_EYE = 2, RIGHT_EYE = 5, LEFT_EAR = 7, RIGHT_EAR = 8, LEFT_SH = 11, RIGHT_SH = 12;
  const nose = landmarks[NOSE];
  const leftEye = landmarks[LEFT_EYE];
  const rightEye = landmarks[RIGHT_EYE];
  const leftEar = landmarks[LEFT_EAR];
  const rightEar = landmarks[RIGHT_EAR];
  const leftShoulder = landmarks[LEFT_SH];
  const rightShoulder = landmarks[RIGHT_SH];

  if (!nose || !leftShoulder || !rightShoulder) return;

  // ===== ปรับค่าได้ =====
  const LEVEL_TOL = 0.04;         // ความเอียงศีรษะ/ไหล่สูงสุดที่ยอมรับ
  const TUCK_THRESHOLD = 0.01;    // Δz ขั้นต่ำเพื่อถือว่า "คางถอย" (น้อยลง = ผ่านง่ายขึ้น)
  // กล่องคาง: วาง "ต่ำกว่าจมูก" ชัดเจนเพื่อกันการแตะที่จมูก
  const CHIN_X_HALF = 0.10;       // กึ่งความกว้างซ้าย/ขวา (normalized)
  const CHIN_Y_MIN_K = 0.12;      // คางเริ่มต่ำกว่าจมูกเป็นสัดส่วนของช่วงไหล่
  const CHIN_Y_MAX_K = 0.28;      // คางสิ้นสุดต่ำกว่าจมูกเป็นสัดส่วนของช่วงไหล่

  // การคลัสเตอร์นิ้วเมื่อมีหลายปลายนิ้วแตะพร้อมกัน (ถ้าอยากเข้มขึ้น)
  const REQUIRE_CLUSTER_FOR_MULTI = true;
  const FINGER_CLUSTER_MAX_DIST = 0.05; // ยิ่งเล็ก = ต้องชิดกันมาก (normalized 0..1)

  // ===== ความตรงของศีรษะ/ไหล่ =====
  const earDiffY = (leftEar && rightEar) ? Math.abs(leftEar.y - rightEar.y) : 0;
  const shoulderDiffY = Math.abs(leftShoulder.y - rightShoulder.y);
  const headShouldersLevel = earDiffY < LEVEL_TOL && shoulderDiffY < LEVEL_TOL;

  // ===== ค่าช่วยคำนวณกรอบคาง =====
  const eyeCenterX = (leftEye && rightEye) ? (leftEye.x + rightEye.x) / 2 : nose.x;
  const shoulderSpan = Math.hypot(leftShoulder.x - rightShoulder.x, leftShoulder.y - rightShoulder.y);

  // ✅ วางกล่องคาง "ต่ำกว่าจมูก" ชัดเจน → ไม่ต้องแตะจมูก
  const chinBox = {
    xMin: eyeCenterX - CHIN_X_HALF,
    xMax: eyeCenterX + CHIN_X_HALF,
    yMin: nose.y + CHIN_Y_MIN_K * shoulderSpan,
    yMax: nose.y + CHIN_Y_MAX_K * shoulderSpan
  };

  // ===== รวมปลายนิ้วที่อยู่ในกล่องคาง =====
  // MediaPipe Hands tip indices: 4=thumb, 8=index, 12=middle, 16=ring, 20=pinky
  const TIP_IDS = [4, 8, 12, 16, 20];
  const chinFingers = [];
  for (const hand of handLandmarks) {
    if (!hand) continue;
    for (const tipId of TIP_IDS) {
      const tip = hand[tipId];
      if (!tip) continue;
      if (tip.x >= chinBox.xMin && tip.x <= chinBox.xMax &&
          tip.y >= chinBox.yMin && tip.y <= chinBox.yMax) {
        chinFingers.push(tip);
      }
    }
  }

  // ต้องมีนิ้วในกล่องคาง (1 นิ้วพอได้) ; ถ้ามี >=2 นิ้ว และเปิดคลัสเตอร์ จะต้องชิดกัน
  let handOnChin = false;
  if (chinFingers.length === 1) {
    handOnChin = true;
  } else if (chinFingers.length >= 2) {
    if (REQUIRE_CLUSTER_FOR_MULTI) {
      let maxDist = 0;
      for (let i = 0; i < chinFingers.length; i++) {
        for (let j = i + 1; j < chinFingers.length; j++) {
          const dx = chinFingers[i].x - chinFingers[j].x;
          const dy = chinFingers[i].y - chinFingers[j].y;
          const d = Math.hypot(dx, dy);
          if (d > maxDist) maxDist = d;
        }
      }
      handOnChin = (maxDist <= FINGER_CLUSTER_MAX_DIST);
    } else {
      handOnChin = true;
    }
  }

  // ===== Calibration baseline จมูก (z) =====
  // โครงของคุณใช้ state.chin สำหรับคาลิเบรต
  if (state.chin?.calibrating) {
    const n = state.chin.baselineCount || 0;
    state.chin.baselineNoseZ = (n === 0) ? (nose.z ?? 0)
      : ((state.chin.baselineNoseZ * n + (nose.z ?? 0)) / (n + 1));
    state.chin.baselineCount = n + 1;

    if (state.chin.baselineCount >= 30) {
      state.chin.calibrating = false;
    }
    videoWrapper.classList.remove("green-border");
    videoWrapper.classList.add("red-border");
    countdownElement.textContent = 10;
    return;
  }
  if (state.chin && state.chin.baselineNoseZ == null) {
    state.chin.baselineNoseZ = nose.z ?? 0;
  }

  // ===== เงื่อนไข "คางถอยหลัง" =====
  // หมายเหตุ: บนบางอุปกรณ์ทิศของ z อาจกลับกัน ถ้าทำท่าถูกแต่ไม่ผ่าน ลองสลับ > เป็น < ได้
  const baselineZ = state.chin?.baselineNoseZ ?? (nose.z ?? 0);
  const deltaZ = (nose.z ?? 0) - baselineZ; // ถอยคาง → deltaZ > 0 (ตามโมเดลส่วนใหญ่)

  // ===== สรุปท่าถูกต้อง =====
  const correctPose = headShouldersLevel && handOnChin && (deltaZ > TUCK_THRESHOLD);

  if (correctPose) {
    // กรอบเขียว + เดินหน้าจับเวลา
    state.wrongPoseTimer = 0;
    videoWrapper.classList.remove("red-border");
    videoWrapper.classList.add("green-border");

    state.poseTimer += 1 / 60; // ~60fps
    const leftSec = Math.max(10 - Math.floor(state.poseTimer), 0);
    countdownElement.textContent = leftSec;

    if (state.poseTimer >= 10) {
      // นับสำเร็จ
      state.poseCount += 1;
      poseCountElement.textContent = state.poseCount;

      // รีเซ็ตจับเวลา
      state.poseTimer = 0;
      state.wrongPoseTimer = 0;
      countdownElement.textContent = 10;

      // ปรับ baseline กัน drift เล็กน้อย
      if (state.chin) {
        state.chin.baselineNoseZ = (baselineZ * 0.7) + ((nose.z ?? 0) * 0.3);
      }
    }
  } else if (state.isPoseDetectionActive) {
    // ท่าผิด → สะสมเวลาผิดท่า
    state.wrongPoseTimer = (state.wrongPoseTimer || 0) + 1 / 60;
    if (state.wrongPoseTimer > 2) {
      state.poseTimer = 0;
      state.wrongPoseTimer = 0;
      countdownElement.textContent = 10;
      videoWrapper.classList.remove("green-border");
      videoWrapper.classList.add("red-border");
    }
  }
}
