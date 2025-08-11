// /js/checkNeckRotation.js
// ตรวจจับ Neck Rotation: หมุนหน้าไปซ้าย/ขวาอย่างชัดเจน (yaw) ไหล่/ศีรษะไม่เอียงมาก
export function checkNeckRotation(landmarks, state, elements) {
  const { videoWrapper, countdownElement, poseCountElement } = elements;

  const nose = landmarks[0];
  const leftEye = landmarks[2];
  const rightEye = landmarks[5];
  const leftEar = landmarks[7];
  const rightEar = landmarks[8];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];

  // จุดกึ่งกลางตา (ใช้เป็นอ้างอิงแนวหน้า)
  const eyeCenterX = (leftEye.x + rightEye.x) / 2;
  const eyeCenterY = (leftEye.y + rightEye.y) / 2;

  // เมตริกพื้นฐาน
  const earDiffY = Math.abs(leftEar.y - rightEar.y);                // เอียงหัว (roll) — ควรต่ำ
  const shoulderDiffY = Math.abs(leftShoulder.y - rightShoulder.y); // ไหล่เอียง — ควรต่ำ
  const noseYawOffset = Math.abs(nose.x - eyeCenterX);              // หมุนหน้า (yaw) — ควรสูงขึ้นเมื่อหันชัด

  // เกณฑ์ (ปรับตามกล้อง/ผู้ใช้ได้)
  const YAW_THRESHOLD = 0.08;        // หันหน้าอย่างชัดเจน
  const HEAD_ROLL_MAX = 0.04;        // ศีรษะเอียงไม่มาก
  const SHOULDER_LEVEL_MAX = 0.04;   // ไหล่เอียงไม่มาก
  const PITCH_MAX = 0.04;            // ไม่ก้ม/เงยมาก (คงระดับใกล้ eye line)
  const pitchAmount = Math.abs(nose.y - eyeCenterY);

  const correctPose =
    noseYawOffset > YAW_THRESHOLD &&
    earDiffY < HEAD_ROLL_MAX &&
    shoulderDiffY < SHOULDER_LEVEL_MAX &&
    pitchAmount < PITCH_MAX;

  if (correctPose) {
    // ท่าถูก → กรอบเขียว + นับถอยหลัง
    state.wrongPoseTimer = 0;
    videoWrapper.classList.remove("red-border");
    videoWrapper.classList.add("green-border");

    state.poseTimer += 1 / 60; // ~60fps
    const leftSec = Math.max(10 - Math.floor(state.poseTimer), 0);
    countdownElement.textContent = leftSec;

    if (state.poseTimer >= 10) {
      // สำเร็จ 1 รอบ
      state.poseCount += 1;
      poseCountElement.textContent = state.poseCount;

      // เริ่มรอบใหม่ทันที
      state.poseTimer = 0;
      state.wrongPoseTimer = 0;
      countdownElement.textContent = 10;
    }
  } else if (state.isPoseDetectionActive) {
    // ท่าผิดสะสม > 2s → รีเซ็ตนับใหม่
    state.wrongPoseTimer += 1 / 60;
    if (state.wrongPoseTimer > 2) {
      state.poseTimer = 0;
      state.wrongPoseTimer = 0;
      countdownElement.textContent = 10;
      videoWrapper.classList.remove("green-border");
      videoWrapper.classList.add("red-border");
    }
  }
}
