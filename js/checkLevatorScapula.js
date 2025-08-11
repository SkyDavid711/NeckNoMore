// /js/checkLevatorScapula.js
export function checkLevatorScapula(landmarks, state, elements) {
  const { videoWrapper, countdownElement, poseCountElement } = elements;

  // ใช้ landmarks ตาม MediaPipe Pose
  const nose = landmarks[0];
  const leftEye = landmarks[2];   // approx center left eye
  const rightEye = landmarks[5];  // approx center right eye
  const leftEar = landmarks[7];
  const rightEar = landmarks[8];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];

  // ค่ากึ่งกลางดวงตา (ใช้วัดก้ม/เงย และเปรียบเทียบแกน X)
  const eyeCenterX = (leftEye.x + rightEye.x) / 2;
  const eyeCenterY = (leftEye.y + rightEye.y) / 2;

  // เกณฑ์
  const earDiffY = Math.abs(leftEar.y - rightEar.y);                // เอียงหัว (roll)
  const shoulderDiffY = Math.abs(leftShoulder.y - rightShoulder.y); // ระดับไหล่
  const noseOffsetX = Math.abs(nose.x - eyeCenterX);                // หันหน้า (yaw)
  const noseOffsetDown = nose.y - eyeCenterY;                       // ก้ม (pitch)

  // Thresholds (ปรับได้ตามกล้อง/แสง/บุคคล)
  const TILT_THRESHOLD = 0.05;       // เอียงหัวพอควร
  const ROTATE_THRESHOLD = 0.03;     // หันหน้าพอควร
  const LOOKDOWN_THRESHOLD = 0.03;   // ก้มลงพอควร
  const SHOULDER_LEVEL_MAX = 0.04;   // ไหล่ห้ามเอียงมาก

  const correctPose =
    earDiffY > TILT_THRESHOLD &&
    noseOffsetX > ROTATE_THRESHOLD &&
    noseOffsetDown > LOOKDOWN_THRESHOLD &&
    shoulderDiffY < SHOULDER_LEVEL_MAX;

  if (correctPose) {
    // ท่าถูก → ขอบเขียว + นับถอยหลัง
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
      // กรอบยังเขียวต่อถ้ายังอยู่ในท่าที่ถูก
    }
  } else if (state.isPoseDetectionActive) {
    // ท่าผิด → หากผิดสะสม > 2s ให้รีเซ็ต
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
