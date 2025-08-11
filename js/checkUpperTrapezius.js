export function checkUpperTrapezius(
    landmarks,
    state,
    elements
) {
    const { poseTimer, wrongPoseTimer, poseSuccess } = state;
    const { videoWrapper, countdownElement, poseCountElement } = elements;

    const leftEar = landmarks[7];
    const rightEar = landmarks[8];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];

    const earDiffY = Math.abs(leftEar.y - rightEar.y);
    const shoulderDiffY = Math.abs(leftShoulder.y - rightShoulder.y);

    let newPoseTimer = poseTimer;
    let newWrongPoseTimer = wrongPoseTimer;
    let newPoseSuccess = poseSuccess;
    let countdownValue = Math.max(10 - Math.floor(newPoseTimer), 0);

    const correctPose = earDiffY > 0.05 && shoulderDiffY < 0.03;

    if (correctPose) {
        newWrongPoseTimer = 0;
        videoWrapper.classList.remove("red-border");
        videoWrapper.classList.add("green-border");

        newPoseTimer += 1 / 60;
        countdownValue = Math.max(10 - Math.floor(newPoseTimer), 0);
        countdownElement.textContent = countdownValue;

        if (newPoseTimer >= 10 && !newPoseSuccess) {
            newPoseSuccess = true;
            videoWrapper.classList.remove("green-border");
            countdownElement.textContent = "✓";
            state.poseCount++;
            poseCountElement.textContent = state.poseCount;

            setTimeout(() => { countdownElement.style.display = "none"; }, 1000);
        }
    } else {
        newWrongPoseTimer += 1 / 60;
        if (newWrongPoseTimer > 2) {
            // reset timer
            newPoseTimer = 0;
            newWrongPoseTimer = 0;
            countdownValue = 10;
            countdownElement.textContent = countdownValue;
            videoWrapper.classList.remove("green-border");
            videoWrapper.classList.add("red-border");
        }
    }

    // คืนค่ากลับ state ที่อัปเดตแล้ว
    state.poseTimer = newPoseTimer;
    state.wrongPoseTimer = newWrongPoseTimer;
    state.poseSuccess = newPoseSuccess;
}
