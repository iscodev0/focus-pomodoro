
let intervalId = null;
let isRunning = false;

self.onmessage = (e) => {
    const { type, payload } = e.data;

    switch (type) {
        case 'START':
            if (!isRunning) {
                isRunning = true;
                intervalId = setInterval(() => {
                    self.postMessage({ type: 'TICK' });
                }, 1000);
            }
            break;
        case 'PAUSE':
            if (isRunning) {
                isRunning = false;
                if (intervalId) {
                    clearInterval(intervalId);
                    intervalId = null;
                }
            }
            break;
        case 'RESET':
            isRunning = false;
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
            }
            break;
    }
};
