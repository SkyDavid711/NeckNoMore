// ตรวจจับท่า Upper Trapezius Stretch: เอียงศีรษะชัดเจน (หูซ้าย-ขวาต่างกัน) แต่ไหล่ไม่เอียงมาก
export function checkUpperTrapezius(landmarks, state, elements) {
  const { videoWrapper, countdownElement, poseCountElement } = elements;

  const leftEar = landmarks[7];
  const rightEar = landmarks[8];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];

  const earDiffY = Math.abs(leftEar.y - rightEar.y);
  const shoulderDiffY = Math.abs(leftShoulder.y - rightShoulder.y);

  // เกณฑ์พื้นฐาน: เอียงหัวชัดเจน และไหล่ค่อนข้างตรง
  const correctPose = earDiffY > 0.05 && shoulderDiffY < 0.03;

  if (correctPose) {
    // โอเค → ขอบเขียว, นับเวลาถอยหลัง
    state.wrongPoseTimer = 0;
    videoWrapper.classList.remove("red-border");
    videoWrapper.classList.add("green-border");

    state.poseTimer += 1 / 60; // ประมาณ 60fps
    const leftSec = Math.max(10 - Math.floor(state.poseTimer), 0);
    countdownElement.textContent = leftSec;

    if (state.poseTimer >= 10) {
      // สำเร็จ 1 รอบ
      state.poseCount += 1;
      poseCountElement.textContent = state.poseCount;

      // เริ่มรอบใหม่ทันที (นับ 10 วินาทีใหม่)
      state.poseTimer = 0;
      state.wrongPoseTimer = 0;
      countdownElement.textContent = 10;
      // กรอบยังคงเขียวตราบใดที่ท่ายังถูกต้อง
    }
  } else if (state.isPoseDetectionActive) {
    // ท่าผิด → หากผิดสะสม > 2 วินาที ให้รีเซ็ต
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
