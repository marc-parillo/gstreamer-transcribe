
### INSTALL GSTREAMER ON MAC ###

Followed instructions here to install GStreamer on Mac:

`https://github.com/awslabs/amazon-kinesis-video-streams-producer-sdk-cpp`

Summary:

1. `mkdir -p amazon-kinesis-video-streams-producer-sdk-cpp/build`
2. `cd amazon-kinesis-video-streams-producer-sdk-cpp/build`
3. `brew install pkg-config openssl cmake gstreamer gst-plugins-base gst-plugins-good gst-plugins-bad gst-plugins-ugly log4cplus gst-libav`
4. `export PKG_CONFIG_PATH=/usr/local/opt/openssl/lib/pkgconfig`
5. `cmake .. -DBUILD_DEPENDENCIES=OFF -DBUILD_GSTREAMER_PLUGIN=ON`

### QUICK USE ###
Change AWS Keys and paths in `main.js` and run `node run main.js`

### Get Information about a stream ###
`gst-discoverer-1.0 [fileUrl or Path]`                                                                                 

### Listen to Audio Live ###
`gst-launch-1.0 souphttpsrc location=[HLS stream url] ! hlsdemux ! decodebin ! audioconvert ! audioresample ! audio/x-raw, rate=16000 ! autoaudiosink`      

### Watch Video Live ###
`gst-launch-1.0 souphttpsrc location=[HLS stream url] ! hlsdemux ! decodebin ! videoconvert ! videoscale ! autovideosink`   

### Play Audio ###
`gst-play-1.0 [path to audio file]`

### View plugin Information ###
`gst-inspect-1.0 [plugin name]`

### Convert to FLAC ###
`gst-launch-1.0 souphttpsrc location=[HLS stream url] ! hlsdemux ! decodebin ! audioconvert ! audioresample ! audio/x-raw, rate=16000 ! flacenc ! filesink location=[path to file]`