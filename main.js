
const spawn = require('child_process').spawn;
const crypto = require('crypto');
const v4 = require('./aws-signature-v4');
const fs = require('fs');
const WebSocket = require('ws');

const marshaller = require("@aws-sdk/eventstream-marshaller"); // for converting binary event stream messages to and from JSON
const util_utf8_node = require("@aws-sdk/util-utf8-node"); // utilities for encoding and decoding UTF8
const eventStreamMarshaller = new marshaller.EventStreamMarshaller(util_utf8_node.toUtf8, util_utf8_node.fromUtf8);

// AWS Region
const awsRegion = '';
// AWS Access Key and Secret for IAM with transcribe permissions
const accessKey = '';
const secretKey = '';
// Location where FLAC file will be saved
const outfile = '/Path/to/outfile/on/your/local/computer/audio.flac';

const streamUrl = 'https://path-to-any-stream.cloudfront.net/livecf/now1/playlist.m3u8';

/**
 * Main function opens the Gstreamer video feed and 
 * opens the connection to AWS
 * 
 */
async function startTranscription() {

    const url = createPresignedUrl();
    const streamUrl = streams[3];

    await openSocketConnection(url);

    startVideoStream(streamUrl);

}

/**
 * Open AWS WebSocket connection
 * 
 * @param {string} presignedUrl 
 * @returns {Promise}
 * 
 */
function openSocketConnection(presignedUrl) {

    console.log('Opening WS Connection', presignedUrl);

    return new Promise(resolve => {

        socket = new WebSocket(presignedUrl);

        socket.binaryType = "arraybuffer";

        socket.on('open', function () {

            console.log('WS Connection Open');

            socket.onmessage = function (message) {
                let messageWrapper = eventStreamMarshaller.unmarshall(Buffer.from(message.data));
                let messageBody = JSON.parse(String.fromCharCode.apply(String, messageWrapper.body));
                const Results = (messageBody?.Transcript?.Results ?? []).length ? messageBody.Transcript.Results[0] : null;
                if (Results && Results.isPartial) {
                    console.log(Results.Alternatives[0].Transcript);
                }
            };

            socket.onerror = function (event) {
                console.log('WS Error', event);
            };

            socket.onclose = function (event) {
                console.log('WS Close', event);
            };

            resolve();

        });

    });

}

/**
 * Start GStreamer video stream, converting to an audio file
 * 
 * @param {string} streamUrl 
 * 
 */
function startVideoStream(streamUrl) {

    if (fs.existsSync(outfile)) {
        fs.unlinkSync(outfile);
    }

    fs.closeSync(fs.openSync(outfile, 'w'));

    spawn('gst-launch-1.0', ['souphttpsrc', `location=${streamUrl}`, '!', 'hlsdemux', '!', 'decodebin', '!', 'audioconvert', '!', 'audioresample', '!', 'audio/x-raw, rate=16000', '!', 'flacenc', '!', 'filesink', `location=${outfile}`]);

    fs.watchFile(outfile, sendAudioStream);

    console.log('Started Video Stream', streamUrl);

}

/**
 * Callback for fs.watchFile to get the most recently
 * added byte data in the outfile
 * 
 * @param {object} curr 
 * @param {object} prev 
 * 
 */
function sendAudioStream(curr, prev) {

    const chunks = [];

    const start = prev.size > 0 ? prev.size + 1 : prev.size;

    const end = curr.size;

    const options = {
        start,
        end,
        highWaterMark: 2 * 1024
    }

    const myReadStream = fs.createReadStream(outfile, options);

    console.log(`Sending Audio Data from ${start} to ${end} totaling ${end - start} bytes`);

    myReadStream.on('data', function (chunk) {
        const binary = convertAudioToBinaryMessage(chunk);
        chunks.push(Buffer.byteLength(binary));
        socket.send(binary);
    });

    myReadStream.on('close', function () {
        console.log(`Finished sending ${chunks.length} chunks of data`);
    })


}

/**
 * Takes an Audio Buffer and transforms it into the JSON payload
 * that AWS expects to receive 
 * 
 * @param {Buffer} audioChunk 
 * @returns {binary}
 * 
 */
function convertAudioToBinaryMessage(audioChunk) {

    let audioEventMessage = {
        headers: {
            ':content-type': {
                type: 'string',
                value: 'application/octet-stream'
            },
            ':event-type': {
                type: 'string',
                value: 'AudioEvent'
            },
            ':message-type': {
                type: 'string',
                value: 'event'
            },
        },
        body: audioChunk
    };


    // convert the JSON object + headers into a binary event stream message
    return eventStreamMarshaller.marshall(audioEventMessage);

}

/**
 * Creates presigned URL with AWS to open the WS commnication
 * to send audio data and receive real-time transcriptions
 * 
 * @returns {string}
 * 
 */
function createPresignedUrl() {

    let endpoint = "transcribestreaming." + awsRegion + ".amazonaws.com:8443";

    return v4.createPresignedURL(
        'GET',
        endpoint,
        '/stream-transcription-websocket',
        'transcribe',
        crypto.createHash('sha256').update('', 'utf8').digest('hex'), {
            'key': accessKey,
            'secret': secretKey,
            'region': awsRegion,
            'protocol': 'wss',
            'expires': 300,
            'query': "language-code=en-US&media-encoding=flac&sample-rate=16000"
        }
    );
}

startTranscription();

