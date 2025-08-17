export function checkUpperTrapezius(landmarks, state, elements) {
  const { videoWrapper, countdownElement, poseCountElement } = elements;

  const leftEar = landmarks[7];
  const rightEar = landmarks[8];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];

  const earDiffY = leftEar.y - rightEar.y; // บวก = หัวเอียงซ้าย, ลบ = หัวเอียงขวา
  const shoulderDiffY = Math.abs(leftShoulder.y - rightShoulder.y);

  let currentSide = null;
  if (earDiffY > 0.05 && shoulderDiffY < 0.03) {
    currentSide = "left";
  } else if (earDiffY < -0.05 && shoulderDiffY < 0.03) {
    currentSide = "right";
  }

  if (currentSide) {
    // ถ้าเพิ่งสำเร็จฝั่งหนึ่งแล้ว ต้องรอไปฝั่งตรงข้ามก่อน
    if (state.lastSide && state.lastSide === currentSide) {
      // ยังอยู่ฝั่งเดิม → ไม่เริ่มจับเวลาใหม่
      videoWrapper.classList.remove("green-border");
      videoWrapper.classList.add("red-border");
      countdownElement.textContent = 10;
      return;
    }

    // กำลังทำท่าถูกฝั่ง
    videoWrapper.classList.remove("red-border");
    videoWrapper.classList.add("green-border");

    state.wrongPoseTimer = 0;
    state.poseTimer += 1 / 60; // ~60fps
    const leftSec = Math.max(10 - Math.floor(state.poseTimer), 0);
    countdownElement.textContent = leftSec;

    if (state.poseTimer >= 10) {
      state.poseCount += 1;
      poseCountElement.textContent = state.poseCount;

      // บันทึกว่าฝั่งไหนที่เพิ่งสำเร็จ
      state.lastSide = currentSide;

      // รีเซ็ต timer
      state.poseTimer = 0;
      countdownElement.textContent = 10;
    }
  } else if (state.isPoseDetectionActive) {
    // ท่าผิด → reset
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
