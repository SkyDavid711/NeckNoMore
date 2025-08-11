// ตรวจจับท่า Chin Tucks โดยใช้ z-axis ของ Nose เทียบ baseline ขณะเริ่ม
export function checkChinTucks(landmarks, state, elements) {
  const { videoWrapper, countdownElement, poseCountElement } = elements;

  const nose = landmarks[0];
  const leftEar = landmarks[7];
  const rightEar = landmarks[8];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];

  // หาค่าเฉลี่ย z ของจุดอ้างอิง (ใช้เฉพาะจมูกเป็นหลัก, baseline จากจมูกเอง)
  const noseZ = nose.z ?? 0;

  // ระดับศีรษะและไหล่ควรตรง (ไม่เอียง)
  const earDiffY = Math.abs(leftEar.y - rightEar.y);
  const shoulderDiffY = Math.abs(leftShoulder.y - rightShoulder.y);
  const headShouldersLevel = earDiffY < 0.03 && shoulderDiffY < 0.03;

  // ----- Calibrate baseline ช่วงสั้น ๆ (เก็บ 30 เฟรม ~ 0.5s) -----
  if (state.chin.calibrating) {
    const n = state.chin.baselineCount;
    state.chin.baselineNoseZ = n === 0
      ? noseZ
      : (state.chin.baselineNoseZ * n + noseZ) / (n + 1);

    state.chin.baselineCount += 1;

    // ครบ 30 เฟรมเลิกคาลิเบรต
    if (state.chin.baselineCount >= 30) {
      state.chin.calibrating = false;
    }

    // ยังคาลิเบรตอยู่ → แสดงกรอบแดงและรอ
    videoWrapper.classList.remove("green-border");
    videoWrapper.classList.add("red-border");
    countdownElement.textContent = 10; // ยังไม่เริ่มนับ
    return;
  }

  // ถ้ายังไม่มี baseline (เผื่อกรณีเริ่มกลางทาง) ให้ตั้งทันที
  if (state.chin.baselineNoseZ == null) {
    state.chin.baselineNoseZ = noseZ;
  }

  // ----- ตรวจ tuck: จมูกถอยหลังเทียบ baseline -----
  const deltaZ = noseZ - state.chin.baselineNoseZ; // ถ้าถอยคาง -> deltaZ เพิ่มขึ้น (บวก)
  const TUCK_THRESHOLD = 0.02; // ปรับได้ตามกล้อง/สภาพแสง

  const correctPose = headShouldersLevel && (deltaZ > TUCK_THRESHOLD);

  if (correctPose) {
    // โอเค → ขอบเขียว, นับเวลาถอยหลัง
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

      // อัปเดต baseline ใหม่เล็กน้อย (กัน drift)
      state.chin.baselineNoseZ = (state.chin.baselineNoseZ * 0.7) + (noseZ * 0.3);
    }
  } else if (state.isPoseDetectionActive) {
    // ท่าผิด → หากผิดสะสม > 2s ให้รีเซ็ตนับใหม่
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
