class QRCodeScanner {
  /**
   * @param rootSelector {String} - a selector of the root element of QRCodeScanner
   * @param debug {Boolean} - OPTION: debug log output. defaults to false.
   */
  constructor({
    rootSelector = "#qrcode-scanner",
    debug = false,
  }) {
    this._init({ rootSelector, debug });
  }

  _init({
    rootSelector,
    debug = false
  }) {
    const self = this;
    if (!jsQR) throw Error("jsQR instance (https://github.com/cozmo/jsQR/) required");
    if (!$) throw Error("jquery instance `$` not found");
    this.debug = debug;
    this.rootSelector = rootSelector;
    const $root = $(rootSelector);
    if (!$root || $root.length <= 0) throw Error(`${rootSelector}: QRCodeScanner's root element not found`);
    this.$root = $root;
    this.$paneWebcam = $root.find("[name=pane-webcam]");
    this.canvas = $root.find("[name=canvas]")[0];
    if (!this.canvas) throw Error(`canvas[name=canvas] in ${rootSelector} element not found`);
    this.video = $root.find(`[name=video]`)[0];
    if (!this.video) throw Error(`video[name=video] in ${rootSelector} element not found`);
    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) throw Error("Canvas 2d context not found");
  }

  open(callback) {
    const self = this;
    self.callback = callback;
    self.$root.show();
  }

  _togglePane(pane = "file") {
    const self = this;
    self.$paneWebcam.show();
    self.$root.find("[name=btn-webcam]").hide();
  }

  startWebcam(e) {
    const self = this;
    self._togglePane("webcam");
    self.webcamStopped = false;
    // open webcam device
    navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: 'environment' }
      }
    }).then(function (stream) {
      self.stream = stream;
      self.video.srcObject = stream;
      self.video.onloadedmetadata = function (e) {
        // Do something with the video here.
        self.video.play();
        self._snapshot(self.callback);
      };
    }).catch(function (e) {
      if (self.debug === true) console.error(`[${self.constructor.name}] exception occurred on \`startWebcam()\`:`, e);
      self._finish(null, self.callback, e);
    });
  }

  _snapshot(cb) {
    const self = this;
    if (self.webcamStopped) return; // NOTE: Don't call the callback!
    // Draws current image from the video element into the canvas
    self.ctx.drawImage(self.video, 0, 0, self.canvas.width, self.canvas.height);
    const imageData = self.ctx.getImageData(0, 0, self.canvas.width, self.canvas.height);
    const data = jsQR(imageData.data, imageData.width, imageData.height);
    if (!data) {
      setTimeout(() => {
        return self._snapshot(cb); // retry ...
      }, 1000);
    } else {
      return self._finish(data, cb);
    }
  }

  _stopWebcam() {
    const self = this;
    if (self.video) {
      self.video.pause();
      self.video.src = "";
    }
    if (self.stream) {
      // self.stream.getVideoTracks()[0].stop();
      self.stream.getTracks().forEach(track => track.stop());
    }
    self.webcamStopped = true;
  }

  /** `stop` function is always called on end of process. */
  _finish(data, cb, err) {
    const self = this;
    self._stopWebcam();
    self.$root.hide();
    return cb && cb(err, data);
  }
};