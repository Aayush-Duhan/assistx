# Granola Native Module - Reverse Engineering Pseudocode

This file contains the reconstructed pseudocode from reverse engineering
`granola.native.windows.win32-x64-msvc.node` using Ghidra.

---

## Table of Contents

1. [FUN_180027ef0 - Audio Device Initializer / Resampler Setup](#fun_180027ef0---audio-device-initializer--resampler-setup)
2. [FUN_1800121d0 - Audio Capture Thread](#fun_1800121d0---audio-capture-thread)
3. [Functions To Investigate](#functions-to-investigate)

---

## FUN_180027ef0 - Audio Device Initializer / Resampler Setup

**Address:** `0x180027ef0`
**Purpose:** Initializes Windows Media Foundation, creates audio device, and sets up resampler

### Original Decompiled Signature:
```c
IErrorInfo * FUN_180027ef0(longlong *param_1, short *param_2, int param_3)
```

### Reconstructed Rust Pseudocode:

```rust
/// Initializes audio capture device and resampler
///
/// # Arguments
/// * `output` - Output storage for the initialized audio device
/// * `format` - Audio format specification (channels, bit depth, etc.)
/// * `sample_rate` - Target sample rate
///
/// # Returns
/// * `Ok(())` on success, `Err` with error info on failure
fn initialize_audio_device(
    output: &mut Option<AudioDevice>,
    format: &AudioFormat,
    sample_rate: i32,
) -> Result<(), WinError> {
    // Determine bit depth based on channel config
    let bit_depth: i16 = if format.channels == 1 {
        0x10  // 16-bit
    } else {
        0x20  // 32-bit
        // Additional validation for format type 3 or -2
    };

    // Initialize COM (single-threaded apartment)
    unsafe {
        CoInitializeEx(null_mut(), COINIT_APARTMENTTHREADED)?;
    }

    // Initialize Windows Media Foundation
    // 0x20070 = MF_VERSION (2.0), 1 = MFSTARTUP_FULL
    unsafe {
        MFStartup(0x20070, MFSTARTUP_FULL)?;
    }

    // Create MMDeviceEnumerator
    // CLSID at DAT_180062910, IID at DAT_1800627c8
    let device_enumerator: IMMDeviceEnumerator = unsafe {
        CoCreateInstance(
            &CLSID_MMDeviceEnumerator,  // DAT_180062910
            null_mut(),
            CLSCTX_INPROC_SERVER,
            &IID_IMMDeviceEnumerator,   // DAT_1800627c8
        )?
    };

    // Query for audio endpoint interface
    // IID at DAT_18006274c
    let audio_endpoint: IMMDevice = device_enumerator
        .QueryInterface(&IID_IMMDevice)?;  // DAT_18006274c

    // Generate unique identifiers for audio session
    // Uses UUIDs: 0x966e5491cff48b1d, 0xaf1adc73a2104b05
    let session_guid = generate_session_guid();

    // Log resampler initialization
    log::debug!("Initializing resampler. Input: {} Hz", format.sample_rate);

    // Initialize input resampler
    // FUN_180028a50 is the resampler initialization function
    let input_resampler = Resampler::new(
        format.sample_rate,
        format.channels,
        bit_depth,
    )?;

    // Initialize output resampler (16-bit mono)
    let output_resampler = Resampler::new(
        sample_rate,
        1,      // mono output
        0x10,   // 16-bit
    )?;

    // Activate audio client on the device
    let audio_client: IAudioClient = audio_endpoint.Activate(
        &IID_IAudioClient,
        CLSCTX_ALL,
    )?;

    // Store result
    *output = Some(AudioDevice {
        device: audio_endpoint,
        client: audio_client,
        input_resampler,
        output_resampler,
        session_guid,
    });

    Ok(())
}
```

### Key Windows APIs Used:
- `CoInitializeEx` - Initialize COM
- `MFStartup(0x20070, 1)` - Initialize Media Foundation v2.0
- `CoCreateInstance` - Create MMDeviceEnumerator
- `QueryInterface` - Get IMMDevice interface

### COM GUIDs (need to verify in binary):
- `DAT_180062910` - CLSID_MMDeviceEnumerator
- `DAT_1800627c8` - IID_IMMDeviceEnumerator
- `DAT_18006274c` - IID_IMMDevice or IID_IAudioClient

---

## FUN_1800121d0 - Audio Capture Thread

**Address:** `0x1800121d0`
**Purpose:** Main audio capture loop - runs in separate thread for mic or loopback capture

### Original Decompiled Signature:
```c
IErrorInfoVtbl * FUN_1800121d0(
    longlong *param_1,          // Capture state
    int param_2,                // Sample rate
    IErrorInfoVtbl *param_3,    // Audio format
    IErrorInfoVtbl *param_4,    // Shared state (Arc<Mutex>)
    longlong *param_5,          // Reference counter
    byte param_6                // is_loopback: 0=mic, 1=system
)
```

### Reconstructed Rust Pseudocode:

```rust
/// Audio capture thread function
/// Runs continuously capturing audio from either microphone or system audio (loopback)
///
/// # Arguments
/// * `state` - Mutable capture state
/// * `sample_rate` - Target sample rate (e.g., 16000)
/// * `format` - Audio format configuration
/// * `shared_state` - Thread-safe shared state (Arc<Mutex<SharedState>>)
/// * `ref_counter` - Reference counter for cleanup
/// * `is_loopback` - false = microphone capture, true = system audio capture
fn audio_capture_thread(
    state: &mut CaptureState,
    sample_rate: i32,
    format: &AudioFormat,
    shared_state: Arc<Mutex<SharedState>>,
    ref_counter: Arc<AtomicI64>,
    is_loopback: bool,
) -> Result<(), CaptureError> {
    // Increment reference count for thread safety
    shared_state.lock().ref_count += 1;

    // Determine capture type string for logging
    let capture_type = if is_loopback { "Loopback" } else { "Mic" };

    // Log thread startup
    log::info!("Capture thread starting... is_capturing_loopback: {}", is_loopback);

    // Initialize COM for this thread
    unsafe {
        CoInitializeEx(null_mut(), COINIT_MULTITHREADED)?;
    }

    // Create device enumerator
    // CLSID at DAT_180060914, IID at DAT_1800605b8
    let device_enumerator: IMMDeviceEnumerator = unsafe {
        CoCreateInstance(
            &CLSID_MMDeviceEnumerator,
            null_mut(),
            CLSCTX_ALL,
            &IID_IMMDeviceEnumerator,
        )?
    };

    // Determine data flow direction
    // For microphone: eCapture (0)
    // For loopback: eRender (1) - we capture from render device
    let data_flow = if is_loopback {
        EDataFlow::eRender    // Loopback captures from output device
    } else {
        EDataFlow::eCapture   // Mic captures from input device
    };

    let role = ERole::eConsole;

    log::debug!("Getting default audio device for {}", capture_type);

    // Get default audio endpoint
    let device: IMMDevice = device_enumerator.GetDefaultAudioEndpoint(
        data_flow,
        role,
    )?;

    // Get device ID for logging
    let device_id = device.GetId()?;
    let device_name = if is_loopback { "Render" } else { "Capture" };
    log::info!("{} device: {}", device_name, device_id);

    // Report capture device to JavaScript (for mic only)
    if !is_loopback {
        let lock = shared_state.lock();
        if let Some(ref log_callback) = lock.log_callback {
            // Report device info to JS
            report_capture_device(log_callback, &device_id)?;
        } else {
            log::warn!("Warning: No log callback set but trying to log");
        }
    }

    // Activate audio client
    let audio_client: IAudioClient = device.Activate(
        &IID_IAudioClient,
        CLSCTX_ALL,
        null_mut(),
    )?;

    // Set audio client event handle for loopback mode
    if is_loopback {
        audio_client.SetEventHandle(/* ... */)?;
    }

    // Get audio format from device
    let mix_format = audio_client.GetMixFormat()?;

    // Get stream latency information
    let stream_latency = audio_client.GetStreamLatency()?;

    log::debug!(
        "Initializing resampler, sample rate: {}",
        format.sample_rate
    );

    // Initialize resampler using FUN_180027ef0
    let resampler = initialize_audio_device(
        &mut state.resampler,
        &mix_format,
        sample_rate,
    )?;

    // Initialize capture client
    let capture_client: IAudioCaptureClient = audio_client.GetService(
        &IID_IAudioCaptureClient,
    )?;

    // Start audio client
    audio_client.Start()?;

    // ============================================
    // MAIN CAPTURE LOOP
    // ============================================
    loop {
        // Check if stop was requested
        // FUN_180027810 checks the stop flag
        if shared_state.lock().should_stop {
            break;
        }

        // Get available audio frames
        let packet_length = capture_client.GetNextPacketSize()?;

        if packet_length == 0 {
            // No audio available, sleep and retry
            // 10000000 * 100ns = 10ms
            std::thread::sleep(Duration::from_millis(10));

            // Check state again
            if shared_state.lock().is_stopped() {
                break;
            }
            continue;
        }

        // Get audio buffer
        let (buffer, num_frames, flags) = capture_client.GetBuffer()?;

        // Check for silence flag
        let is_silent = (flags & AUDCLNT_BUFFERFLAGS_SILENT) != 0;

        // Process audio data
        if !is_silent && num_frames > 0 {
            // Convert raw buffer to audio samples
            let samples = unsafe {
                std::slice::from_raw_parts(
                    buffer as *const i16,
                    num_frames as usize * format.channels as usize,
                )
            };

            // Resample if necessary
            // FUN_1800284d0 performs the resampling
            let resampled = state.resampler.process(samples)?;

            // Prepare output buffers based on capture type
            let (mic_buffer, system_buffer) = if is_loopback {
                (None, Some(Buffer::from(resampled)))
            } else {
                (Some(Buffer::from(resampled)), None)
            };

            // Call JavaScript callback with audio data
            // FUN_180005510 invokes the threadsafe function
            shared_state.lock().audio_callback.call(
                mic_buffer,
                system_buffer,
            )?;
        }

        // Release buffer
        capture_client.ReleaseBuffer(num_frames)?;
    }

    // ============================================
    // CLEANUP
    // ============================================

    log::info!("Audio capture stopped.");

    // Stop audio client
    audio_client.Stop()?;

    // Release resampler
    drop(state.resampler.take());

    // Free device ID string
    unsafe {
        CoTaskMemFree(device_id as *mut _);
    }

    // Decrement reference counter
    ref_counter.fetch_sub(1, Ordering::SeqCst);

    // Decrement shared state reference
    shared_state.lock().ref_count -= 1;
    if shared_state.lock().ref_count == 0 {
        // Cleanup shared state
    }

    Ok(())
}
```

### Key Strings Found:
| Address | String |
|---------|--------|
| `0x1800608f8` | `"Capture_thread_starting..._is_ca"` |
| `0x180060950` | `"Getting_default_audio_de"` |
| `0x1800607d8` | Device logging |
| `0x180060850` | `"Failed_to_report_capture_device_u"` |
| `0x1800608b0` | `"Warning:_No_log_callback_set_but"` |
| `0x180060a10` | `"Initializing_resampler,_sample_r"` |
| N/A | `"Audio capture stopped."` |

### Key Function Calls:
| Function | Purpose |
|----------|---------|
| `FUN_180027ef0` | Initialize resampler (called within thread) |
| `FUN_180027810` | Check if stop requested |
| `FUN_1800113f0` | Process audio frame |
| `FUN_1800284d0` | Resample audio data |
| `FUN_180005510` | Call JavaScript callback |
| `FUN_180039e90` | Check capture state |
| `FUN_180039cf0` | Get audio data |
| `thunk_FUN_180046d30` | Sleep (10ms) |

---

## FUN_180028a50 - Create Media Type for Resampler

**Address:** `0x180028a50`
**Purpose:** Creates and configures an IMFMediaType for audio resampling

### Original Decompiled Signature:
```c
void FUN_180028a50(undefined8 *param_1, int param_2, undefined8 param_3, short param_4)
```

### Reconstructed Rust Pseudocode:

```rust
/// Creates a Media Foundation media type for audio processing
///
/// # Arguments
/// * `output` - Output for the created media type (Result-like struct)
/// * `sample_rate` - Audio sample rate
/// * `channels` - Number of audio channels
/// * `bit_depth` - Bits per sample (0x10=16-bit, 0x20=32-bit)
///
/// # Returns
/// * Stores IMFMediaType pointer and error code in output
fn create_audio_media_type(
    output: &mut MediaTypeResult,
    sample_rate: i32,
    channels: u64,
    bit_depth: i16,  // 0x10 (16) or 0x20 (32)
) {
    // Create empty media type
    let mut media_type: *mut IMFMediaType = null_mut();
    let hr = unsafe { MFCreateMediaType(&mut media_type) };

    if FAILED(hr) {
        output.media_type = get_error_info();
        if sample_rate != 0 {
            output.error_code = sample_rate;
            return;
        }
    }

    if media_type.is_null() {
        output.media_type = null_mut();
        output.error_code = 0x535f4f4b;  // "OK_S" reversed - success marker
        return;
    }

    // Configure based on bit depth
    if bit_depth == 0x20 {
        // 32-bit float audio format
        // Set MF_MT_MAJOR_TYPE = MFMediaType_Audio
        set_guid_attribute(&media_type, &MF_MT_MAJOR_TYPE, &MFMediaType_Audio)?;

        // Set MF_MT_SUBTYPE = MFAudioFormat_Float
        set_guid_attribute(&media_type, &MF_MT_SUBTYPE, &MFAudioFormat_Float)?;

        // Set additional float format attributes
        set_uint32_attribute(&media_type, &MF_MT_AUDIO_BITS_PER_SAMPLE, 32)?;
    } else {
        // 16-bit PCM audio format
        // Set MF_MT_MAJOR_TYPE = MFMediaType_Audio
        set_guid_attribute(&media_type, &MF_MT_MAJOR_TYPE, &MFMediaType_Audio)?;

        // Set MF_MT_SUBTYPE = MFAudioFormat_PCM
        set_guid_attribute(&media_type, &MF_MT_SUBTYPE, &MFAudioFormat_PCM)?;

        // Set additional PCM format attributes
        set_uint32_attribute(&media_type, &MF_MT_AUDIO_BITS_PER_SAMPLE, 16)?;
    }

    // Common attributes for both formats:
    // MF_MT_AUDIO_NUM_CHANNELS
    set_uint32_attribute(&media_type, &MF_MT_AUDIO_NUM_CHANNELS, channels)?;

    // MF_MT_AUDIO_SAMPLES_PER_SECOND
    set_uint32_attribute(&media_type, &MF_MT_AUDIO_SAMPLES_PER_SECOND, sample_rate)?;

    // MF_MT_AUDIO_BLOCK_ALIGNMENT
    let block_align = channels * (bit_depth / 8);
    set_uint32_attribute(&media_type, &MF_MT_AUDIO_BLOCK_ALIGNMENT, block_align)?;

    // MF_MT_AUDIO_AVG_BYTES_PER_SECOND
    let avg_bytes = sample_rate * block_align;
    set_uint32_attribute(&media_type, &MF_MT_AUDIO_AVG_BYTES_PER_SECOND, avg_bytes)?;

    // MF_MT_ALL_SAMPLES_INDEPENDENT
    set_uint32_attribute(&media_type, &MF_MT_ALL_SAMPLES_INDEPENDENT, 1)?;

    // Success - store result
    output.media_type = media_type;
    output.error_code = 0;
}
```

### Key Windows APIs:
- `MFCreateMediaType` - Creates an empty media type
- `FUN_18003a510` - Sets GUID attribute (like `IMFMediaType::SetGUID`)
- `FUN_18003a4e0` - Sets UINT32 attribute (like `IMFMediaType::SetUINT32`)

### Media Type Attributes Set:
| Attribute | Purpose |
|-----------|---------|
| `MF_MT_MAJOR_TYPE` | Audio |
| `MF_MT_SUBTYPE` | PCM or Float |
| `MF_MT_AUDIO_BITS_PER_SAMPLE` | 16 or 32 |
| `MF_MT_AUDIO_NUM_CHANNELS` | Channel count |
| `MF_MT_AUDIO_SAMPLES_PER_SECOND` | Sample rate |
| `MF_MT_AUDIO_BLOCK_ALIGNMENT` | Block alignment |
| `MF_MT_AUDIO_AVG_BYTES_PER_SECOND` | Byte rate |

---

## FUN_1800284d0 - Process Audio Buffer / Resample

**Address:** `0x1800284d0`
**Purpose:** Creates MF samples, processes audio data, and performs resampling

### Original Decompiled Signature:
```c
undefined8 * FUN_1800284d0(
    undefined8 *param_1,    // Output buffer result
    longlong *param_2,      // Resampler state
    undefined8 *param_3,    // Input audio data
    ulonglong param_4       // Input data size
)
```

### Reconstructed Rust Pseudocode:

```rust
/// Processes audio data through the resampler
/// Creates MF samples, copies data, and invokes resampler transform
///
/// # Arguments
/// * `output` - Output struct to store resampled audio
/// * `resampler` - Resampler state (contains IMFTransform)
/// * `input_data` - Raw audio input buffer
/// * `input_size` - Size of input data in bytes
///
/// # Returns
/// * Populates output with resampled audio or error
fn process_audio_buffer(
    output: &mut AudioBufferResult,
    resampler: &mut ResamplerState,
    input_data: &[u8],
    input_size: u64,
) -> &mut AudioBufferResult {
    // Check if resampler is initialized
    if !resampler.is_initialized() {
        output.data = null_mut();
        output.error_code = 0x8000ffff;  // E_UNEXPECTED
        return output;
    }

    // Early exit if no input data
    if resampler.input_buffer.is_null() {
        panic!("src\\audio_capture\\resampler.rs - resampler not initialized");
    }

    // ========================================
    // Step 1: Create input sample
    // ========================================
    let mut input_sample: *mut IMFSample = null_mut();
    let hr = unsafe { MFCreateSample(&mut input_sample) };
    if FAILED(hr) {
        output.sample = get_error_info();
        output.error_code = hr;
        output.data = 0x8000000000000000;  // Error marker
        return output;
    }

    // ========================================
    // Step 2: Create input memory buffer
    // ========================================
    let mut input_buffer: *mut IMFMediaBuffer = null_mut();
    let hr = unsafe {
        MFCreateMemoryBuffer(input_size as u32, &mut input_buffer)
    };
    if FAILED(hr) {
        output.sample = get_error_info();
        output.error_code = hr;
        output.data = 0x8000000000000000;
        release(input_sample);
        return output;
    }

    // ========================================
    // Step 3: Lock buffer and copy input data
    // ========================================
    let (buffer_ptr, max_len, current_len) = lock_buffer(input_buffer)?;

    // FUN_1800578b0 - Copy audio data into buffer
    copy_audio_data(buffer_ptr, input_data, input_size);

    unlock_buffer(input_buffer)?;
    set_current_length(input_buffer, input_size)?;

    // ========================================
    // Step 4: Add buffer to input sample
    // ========================================
    input_sample.AddBuffer(input_buffer)?;

    // ========================================
    // Step 5: Feed input to resampler
    // ========================================
    // FUN_18000cd80 - Process input through IMFTransform
    resampler.transform.ProcessInput(0, input_sample, 0)?;

    // ========================================
    // Step 6: Create output sample
    // ========================================
    // Calculate output size (may be different due to resampling)
    // Formula: (input_size * 0xaaaaaaaaaaaaaaab) >> 8 & ~1
    // This is approximately: input_size * 2/3 (for 48kHz -> 16kHz)
    let output_size = calculate_output_size(input_size);
    let output_size = std::cmp::max(output_size, 0x2000);  // Minimum 8KB

    let mut output_sample: *mut IMFSample = null_mut();
    let hr = unsafe { MFCreateSample(&mut output_sample) };
    if FAILED(hr) {
        output.sample = get_error_info();
        output.error_code = hr;
        output.data = 0x8000000000000000;
        return output;
    }

    // ========================================
    // Step 7: Create output memory buffer
    // ========================================
    let mut output_buffer: *mut IMFMediaBuffer = null_mut();
    let hr = unsafe {
        MFCreateMemoryBuffer(output_size as u32, &mut output_buffer)
    };
    if FAILED(hr) {
        output.sample = get_error_info();
        output.error_code = hr;
        output.data = 0x8000000000000000;
        release(output_sample);
        return output;
    }

    // Add buffer to output sample
    output_sample.AddBuffer(output_buffer)?;

    // ========================================
    // Step 8: Get resampled output
    // ========================================
    // FUN_18003a590 - ProcessOutput on IMFTransform
    let mut output_data_buffer = MFT_OUTPUT_DATA_BUFFER {
        pSample: output_sample,
        dwStatus: 0,
        pEvents: null_mut(),
    };

    let status = resampler.transform.ProcessOutput(
        0,
        1,
        &mut output_data_buffer,
        &mut process_status,
    )?;

    // ========================================
    // Step 9: Extract resampled audio data
    // ========================================
    // FUN_180028c60 - Extract final buffer data
    let resampled_data = extract_buffer_data(output_sample)?;

    // ========================================
    // Step 10: Store result and cleanup
    // ========================================
    output.data = resampled_data.ptr;
    output.length = resampled_data.length;
    output.capacity = resampled_data.capacity;

    // Release temporary buffers
    release(output_buffer);
    release(input_buffer);
    release(input_sample);

    output
}

/// Calculates expected output buffer size after resampling
fn calculate_output_size(input_size: u64) -> u64 {
    // This magic constant 0xaaaaaaaaaaaaaaab is used for division by 3
    // (input * 0xaaaaaaaaaaaaaaab) >> 64 gives input / 3
    // The & ~1 ensures even number (for stereo alignment)
    let rough_size = ((input_size as u128 * 0xaaaaaaaaaaaaaaab) >> 64) as u64;
    rough_size & !1u64  // Ensure even
}
```

### Key Windows APIs Used:
| API | Purpose |
|-----|---------|
| `MFCreateSample` | Create empty audio sample |
| `MFCreateMemoryBuffer` | Create memory buffer for audio |
| `IMFSample::AddBuffer` | Attach buffer to sample |
| `IMFTransform::ProcessInput` | Feed audio to resampler |
| `IMFTransform::ProcessOutput` | Get resampled audio |

### Internal Functions:
| Function | Purpose |
|----------|---------|
| `FUN_1800578b0` | Copy audio data into buffer |
| `FUN_18003a540` | Lock buffer for writing |
| `FUN_18003a280` | Unlock buffer |
| `FUN_180039d50` | Set buffer current length |
| `FUN_18000cd80` | ProcessInput wrapper |
| `FUN_18003a590` | ProcessOutput wrapper |
| `FUN_180028c60` | Extract final buffer data |
| `FUN_18003a650` | Release COM object |
| `FUN_18003b2c0` | Get error info |

### Buffer Size Calculation:
The magic number `0xaaaaaaaaaaaaaaab` is used for efficient division:
- Input at 48kHz → Output at 16kHz = 1/3 ratio
- `(n * 0xaaaaaaaaaaaaaaab) >> 64` ≈ `n / 3`

---

## FUN_180005510 - Send Audio to JavaScript Callback

**Address:** `0x180005510`
**Purpose:** Invokes the N-API threadsafe function to send audio buffers to JavaScript

### Original Decompiled Signature:
```c
uint FUN_180005510(longlong param_1, undefined8 *param_2)
```

### Reconstructed Rust Pseudocode:

```rust
/// Sends audio buffer data to the JavaScript callback via threadsafe function
///
/// # Arguments
/// * `tsfn` - ThreadsafeFunction wrapper (contains reference count at offset +8)
/// * `audio_data` - Audio buffer data structure containing:
///   - [0]: mic_buffer pointer
///   - [1]: mic_buffer length
///   - [2-7]: Additional mic buffer metadata
///   - [8-13]: System audio buffer data
///   - [14-15]: Callback function info
///
/// # Returns
/// * 0 on success
/// * 0x10 if cancelled
/// * 0x400 on other errors
fn send_audio_to_js(
    tsfn: &ThreadsafeFunction,
    audio_data: &AudioBufferData,
) -> u32 {
    // Get reference count pointer (at offset +8)
    let ref_count = &tsfn.ref_count;  // param_1 + 8
    let current_count = *ref_count;

    // Try to increment reference count (for thread safety)
    if current_count < 0x3ffffffe {
        // Atomic compare-exchange
        let old = atomic_cas(ref_count, current_count, current_count + 1);
        if old != current_count {
            // CAS failed, use slow path
            slow_ref_increment(ref_count);
        }
    } else {
        // Reference count at max, use slow path
        slow_ref_increment(ref_count);
    }

    // Check if threadsafe function is aborted
    // param_1 + 0x10 is the "is_aborted" flag
    let is_aborted = tsfn.is_aborted;  // param_1 + 0x10

    if is_aborted {
        // Panic - this shouldn't happen
        panic!("Threadsafe Function aborted lock failed");
    }

    // Check if callback is still valid
    // param_1 + 0x11 is another status flag
    let is_invalid = tsfn.status;  // param_1 + 0x11

    if is_invalid {
        // Callback was cancelled/released
        cleanup_buffers(&audio_data);

        // Decrement reference count
        atomic_sub(ref_count, 1);

        return 0x10;  // Cancelled status
    }

    // ========================================
    // Prepare callback data
    // ========================================

    // Get the callback function pointer
    let callback_ptr = audio_data.callback_ptr;  // offset 0xe (14)
    let callback_data = audio_data.callback_data; // offset 0xf (15)

    // Get the napi_env from ThreadsafeFunction
    // FUN_18002f4e0 extracts the environment
    let napi_env = get_tsfn_env(callback_ptr + 0x10);

    // ========================================
    // Copy audio buffer data (0x88 = 136 bytes)
    // ========================================

    // Allocate memory for callback payload
    let payload_size = 0x88;  // 136 bytes
    let payload = allocate(payload_size, 8)?;  // 8-byte aligned

    // AudioBufferData layout:
    // [0-1]:   mic_buffer_ptr, mic_buffer_len
    // [2-3]:   mic_buffer metadata
    // [4-5]:   more mic metadata
    // [6-7]:   mic buffer info
    // [8-9]:   system_buffer info
    // [10-11]: system_buffer info
    // [12-13]: system_buffer info
    // [14-15]: callback info

    // Copy the entire 136 bytes of audio data
    // FUN_1800578b0 is memcpy
    memcpy(payload, audio_data, 0x88);

    // ========================================
    // Call the threadsafe function
    // ========================================

    // PTR_PTR_1800805a8 + 0x10 is napi_call_threadsafe_function
    let result = napi_call_threadsafe_function(
        napi_env,
        payload,
        callback_data.mode,  // napi_tsfn_blocking or napi_tsfn_nonblocking
    );

    // Map N-API status to return code
    let status = if result < 0x17 {
        result
    } else {
        0x400  // Generic error
    };

    // Decrement reference count
    atomic_sub(ref_count, 1);

    status
}
```

### Key N-API Calls:
| Function | Purpose |
|----------|---------|
| `napi_call_threadsafe_function` | Queues call to JS callback |
| `FUN_18002f4e0` | Get N-API environment from TSFN |
| `FUN_1800578b0` | memcpy (copy buffer data) |
| `thunk_FUN_1800446c0` | Allocate memory |

### Audio Data Structure (136 bytes / 0x88):
```rust
#[repr(C)]
struct AudioBufferData {
    // Microphone buffer (offsets 0-7, 64 bytes)
    mic_buffer_ptr: *const u8,      // [0]
    mic_buffer_len: usize,          // [1]
    mic_metadata: [u64; 6],         // [2-7]

    // System audio buffer (offsets 8-13, 48 bytes)
    sys_buffer_ptr: *const u8,      // [8]
    sys_buffer_len: usize,          // [9]
    sys_metadata: [u64; 4],         // [10-13]

    // Callback info (offsets 14-15, 16 bytes)
    callback_ptr: *const (),        // [14] - ThreadsafeFunction
    callback_mode: u64,             // [15] - Call mode
}
```

### Error Codes:
| Code | Meaning |
|------|---------|
| `0x00` | Success |
| `0x10` | Cancelled/Invalid |
| `0x400` | Generic error |

---

## FUN_180027810 - Check Stop Flag / Acquire Lock

**Address:** `0x180027810`
**Purpose:** Atomically checks if capture should stop and acquires lock

### Original Decompiled Signature:
```c
ulonglong * FUN_180027810(ulonglong *param_1, char *param_2)
```

### Reconstructed Rust Pseudocode:

```rust
/// Checks if audio capture should stop and manages lock state
///
/// # Arguments
/// * `output` - Output struct to store result
/// * `lock_flag` - Pointer to atomic lock/stop flag
///
/// # Returns
/// * output[0] = 1 if should stop, 0 if should continue
/// * output[1] = pointer to the lock flag
/// * output[2] = thread check result
struct StopCheckResult {
    should_stop: u64,    // 1 = stop, 0 = continue
    lock_ptr: *mut u8,   // Pointer to lock
    thread_ok: u8,       // Thread sanity check
}

fn check_stop_flag(
    output: &mut StopCheckResult,
    lock_flag: &mut AtomicU8,
) -> &mut StopCheckResult {
    // ========================================
    // Atomic lock acquisition
    // ========================================

    // Try to acquire lock atomically
    // If lock_flag is 0, set it to 1 (acquired)
    let previous_value = {
        // LOCK prefix - atomic operation
        let old = *lock_flag;
        if old == 0 {
            *lock_flag = 1;  // Acquire lock
        }
        old
    };

    // If lock was already held, wait for it
    if previous_value != 0 {
        // FUN_18005db00 - Wait on address (like WaitOnAddress)
        wait_for_lock(lock_flag);
    }

    // ========================================
    // Check thread state
    // ========================================

    // Check global thread state flag
    // PTR_DAT_180080608 points to thread state
    let thread_check: u8;
    let global_state = unsafe { *(PTR_DAT_180080608 as *const u64) };

    if (global_state & 0x7fffffffffffffff) == 0 {
        // Thread state is clear
        thread_check = 0;
    } else {
        // FUN_18005da90 - Additional thread check
        let check_result = additional_thread_check();
        thread_check = (check_result as u8) ^ 1;  // Invert result
    }

    // ========================================
    // Read stop status
    // ========================================

    // lock_flag[1] contains the "should stop" status
    // This is set by stopAudioCapture()
    let should_stop = lock_flag.offset(1);  // param_2[1]

    // ========================================
    // Store results
    // ========================================

    output.lock_ptr = lock_flag as *mut u8;  // param_1[1] = param_2
    output.thread_ok = thread_check;          // param_1[2] = thread check
    output.should_stop = if *should_stop != 0 { 1 } else { 0 };  // param_1[0]

    output
}
```

### Lock Flag Structure:
```rust
#[repr(C)]
struct CaptureControlFlag {
    lock: AtomicU8,      // [0] - Lock state (0=free, 1=held, 2=waiting)
    should_stop: u8,     // [1] - Stop signal (0=continue, non-0=stop)
}
```

### Behavior:
1. **Atomically acquires lock** on the control flag
2. **Checks global thread state** for sanity
3. **Reads stop flag** (set by `stopAudioCapture`)
4. **Returns combined result** indicating if loop should exit

### Used By:
- Called from `FUN_1800121d0` at the start of each capture loop iteration
- If `should_stop` is non-zero, the capture loop breaks

---

## Functions To Investigate

### Remaining (Lower Priority):
| Function | Likely Purpose |
|----------|----------------|
| `FUN_180028c60` | Extract buffer data from IMFSample |
| `FUN_1800578b0` | memcpy implementation |
| `FUN_18003a650` | Release/cleanup COM object |
| `FUN_18003b2c0` | Get HRESULT error info |
| `FUN_18002f4e0` | Get N-API env from TSFN |

### Utility Functions (Already Understood):
| Function | Purpose |
|----------|---------|
| `FUN_18003a510` | IMFMediaType::SetGUID wrapper |
| `FUN_18003a4e0` | IMFMediaType::SetUINT32 wrapper |
| `FUN_18003a540` | IMFMediaBuffer::Lock wrapper |
| `FUN_18003a280` | IMFMediaBuffer::Unlock wrapper |
| `FUN_180039d50` | IMFMediaBuffer::SetCurrentLength |
| `FUN_18000cd80` | IMFTransform::ProcessInput wrapper |
| `FUN_18003a590` | IMFTransform::ProcessOutput wrapper |

### Low Priority:
| Function | Likely Purpose |
|----------|----------------|
| `FUN_18004eb30` | Format logging message |
| `FUN_180011990` | Log output |
| `FUN_180040ff0` | Warning/error logging |
| `FUN_18003ab20` | UUID generation |

---

## UndefinedFunction_18000e990 - Start Audio Capture Coordinator

**Address:** `0x18000e990`
**Purpose:** Main entry point that spawns both microphone and loopback capture threads

### Reconstructed Rust Pseudocode:

```rust
/// Main audio capture coordinator - spawns both capture threads
///
/// Called when JavaScript invokes startAudioCapture()
fn start_audio_capture_main(
    config: &AudioCaptureConfig,
    napi_env: napi_env,
) {
    // Get reference counter and increment
    let ref_counter = config.ref_counter;  // param_1[4]

    // Atomic increment
    let old_count = ref_counter.fetch_add(1);
    if old_count == -1 || overflow_check(old_count) {
        panic!("Reference counter overflow");
    }

    // Check if already capturing
    let status = check_capture_status(ref_counter);
    if status != 0 {
        panic!("fatal runtime error: something happened");
    }

    // Get callback handle
    let callback = get_threadsafe_function(config);
    if callback.is_some() {
        // Store callback for later use
        register_callback(callback, napi_env);
    }

    // ========================================
    // SPAWN MICROPHONE CAPTURE THREAD
    // ========================================
    let mic_config = MicCaptureConfig {
        state: config[0..3],
        sample_rate: config.sample_rate,
        format: config.format,
    };
    FUN_18001e710(&mic_config);  // Spawns thread with is_loopback=0

    // ========================================
    // SPAWN LOOPBACK CAPTURE THREAD
    // ========================================
    let loopback_config = LoopbackCaptureConfig {
        state: config[6..9],
        sample_rate: config.sample_rate,
        format: config.format,
    };
    FUN_18001e740(&loopback_config);  // Spawns thread with is_loopback=1

    // ========================================
    // STORE CLEANUP CALLBACK
    // ========================================
    let shared_state = config[5];
    if shared_state.cleanup_fn.is_some() {
        // Execute any existing cleanup
        (shared_state.cleanup_fn)();
    }

    // Register new cleanup handler
    shared_state.is_capturing = true;
    shared_state.cleanup_data = ...;

    // Decrement reference counters
    shared_state.ref_count -= 1;
    if shared_state.ref_count == 0 {
        cleanup_shared_state();
    }

    ref_counter.fetch_sub(1);
    if ref_counter.load() == 0 {
        cleanup_ref_counter();
    }
}
```

---

## FUN_18001e710 - Spawn Microphone Capture Thread

**Address:** `0x18001e710`
**Purpose:** Creates and starts the microphone capture thread

### Key Details:
- Calls `FUN_1800121d0` with `is_loopback = 0`
- Error string: `"AudioCapture_mic_thread_err"` (inferred)
- Handles thread creation and error reporting

### Reconstructed Pseudocode:

```rust
fn spawn_microphone_thread(config: &MicCaptureConfig) {
    // Increment reference count
    let shared_state = config.shared_state;
    shared_state.ref_count.fetch_add(1);

    // Call capture thread function with is_loopback = false
    let result = audio_capture_thread(
        &config.state,           // param_1[1]
        config.sample_rate,      // param_1[4] as i32
        &config.format,          // param_1[2]
        shared_state,            // param_1[0]
        &config.ref_counter,     // param_1[3]
        false,                   // is_loopback = 0 (MICROPHONE)
    );

    if result.is_err() {
        // Log error
        log::error!("AudioCapture mic thread error: {:?}", result);
        cleanup_on_error(result);
    }

    // Decrement reference count
    shared_state.ref_count.fetch_sub(1);
    if shared_state.ref_count.load() == 0 {
        cleanup_shared_state();
    }
}
```

---

## FUN_18001e740 - Spawn Loopback Capture Thread

**Address:** `0x18001e740`
**Purpose:** Creates and starts the system audio (loopback) capture thread

### Original Key Code:
```c
pIVar3 = FUN_1800121d0(
    (longlong *)param_1[1],      // Capture state
    iVar4,                        // Sample rate (from param_1[4])
    (IErrorInfoVtbl *)param_1[2], // Audio format
    pIVar5,                       // Shared state (Arc<Mutex>)
    (longlong *)param_1[3],       // Reference counter
    1                             // is_loopback = TRUE ← KEY!
);
```

### Reconstructed Pseudocode:

```rust
fn spawn_loopback_thread(config: &LoopbackCaptureConfig) {
    // Increment reference count
    let shared_state = config.shared_state;
    shared_state.ref_count.fetch_add(1);

    // Call capture thread function with is_loopback = true
    let result = audio_capture_thread(
        &config.state,           // param_1[1]
        config.sample_rate,      // param_1[4] as i32
        &config.format,          // param_1[2]
        shared_state,            // param_1[0]
        &config.ref_counter,     // param_1[3]
        true,                    // is_loopback = 1 (SYSTEM AUDIO)
    );

    if result.is_err() {
        // Log error
        log::error!("AudioCapture loopback thread error: {:?}", result);
        cleanup_on_error(result);
    }

    // Decrement reference count
    shared_state.ref_count.fetch_sub(1);
    if shared_state.ref_count.load() == 0 {
        cleanup_shared_state();
    }
}
```

---

## Complete Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          JavaScript Layer                                     │
│   startAudioCapture(useCoreAudio, disableEcho, enableGain, rate, callback)  │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│              N-API Handler: UndefinedFunction_180008f20                      │
│   - Parse 5 arguments (bool, bool, bool, number|undefined, function)        │
│   - Create ThreadsafeFunction for callback                                   │
│   - Build AudioCaptureConfig struct                                          │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│              Coordinator: UndefinedFunction_18000e990                        │
│   - Increment reference counters                                             │
│   - Spawn both capture threads                                               │
│   - Register cleanup handlers                                                │
└────────────────────────┬───────────────────────────────┬────────────────────┘
                         │                               │
          ┌──────────────┴──────────────┐    ┌──────────┴─────────────────┐
          ▼                              ▼    ▼                            ▼
┌─────────────────────────┐    ┌─────────────────────────────────────────────┐
│  FUN_18001e710          │    │  FUN_18001e740                              │
│  Mic Thread Spawner     │    │  Loopback Thread Spawner                    │
│  is_loopback = 0        │    │  is_loopback = 1                            │
└───────────┬─────────────┘    └────────────────┬────────────────────────────┘
            │                                   │
            ▼                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FUN_1800121d0 - Audio Capture Thread                      │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ 1. CoInitializeEx()                                                   │  │
│  │ 2. CoCreateInstance(IMMDeviceEnumerator)                              │  │
│  │ 3. GetDefaultAudioEndpoint(is_loopback ? eRender : eCapture)         │  │
│  │ 4. Activate(IAudioClient)                                             │  │
│  │ 5. FUN_180027ef0() - Initialize resampler                             │  │
│  │ 6. Start capture loop:                                                │  │
│  │    a. FUN_180027810() - Check stop flag                               │  │
│  │    b. GetBuffer() from IAudioCaptureClient                            │  │
│  │    c. FUN_1800284d0() - Resample audio                                │  │
│  │    d. FUN_180005510() - Send to JavaScript callback                   │  │
│  │ 7. Cleanup on exit                                                    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         JavaScript Callback                                  │
│   callback(microphoneBuffer: Buffer | null, systemBuffer: Buffer | null)    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## N-API Method Registration Table

From `UndefinedFunction_180009ca0`:

| Method | Handler Address | Implementation |
|--------|-----------------|----------------|
| `constructor` | `LAB_180008760` | Class instantiation |
| `crashAudioCapture` | `LAB_1800097f0` | Debug crash trigger |
| `getAudioCaptureStatus` | `LAB_180009560` | Returns status object |
| `requestMicrophonePermission` | `LAB_1800088a0` | Permission request |
| `requestSystemAudioPermission` | `LAB_180008ba0` | Permission request |
| `setGlobalLogFunction` | `LAB_1800099f0` | Sets log callback |
| `startAudioCapture` | `LAB_180008f20` | Starts capture |
| `stopAudioCapture` | `LAB_180009330` | Stops capture |

---

## Data Structures (Confirmed from Analysis)

### AudioFormat
```rust
#[repr(C)]
struct AudioFormat {
    channels: i16,       // param_2[0]
    channel_config: i16, // param_2[1]
    sample_rate: i32,    // param_2[2..4]
    // more fields...
}
```

### CaptureState
```rust
struct CaptureState {
    resampler: Option<Resampler>,
    device: Option<IMMDevice>,
    audio_client: Option<IAudioClient>,
    capture_client: Option<IAudioCaptureClient>,
    is_capturing: bool,
}
```

### SharedState (Confirmed Offsets!)
```rust
/// Shared state between JavaScript and capture threads
/// Two instances exist: one for microphone, one for loopback
#[repr(C)]
struct SharedState {
    // Offsets 0x00 - 0x0F: Internal data
    ref_count: AtomicI64,              // Reference counting
    audio_callback: *mut ThreadsafeFunction,  // JS callback

    // Offset 0x10: Lock for thread synchronization
    lock: AtomicU8,                    // 0=free, 1=held, 2=waiting

    // Offset 0x11: Error flag
    error_flag: u8,                    // Non-zero = error occurred

    // Offset 0x12: CAPTURE ACTIVE FLAG (confirmed!)
    is_active: bool,                   // true = currently capturing

    // Following bytes: Additional state...
    log_callback: Option<*mut ThreadsafeFunction>,
}
```

### AudioCaptureConfig
```rust
/// Configuration passed to start_audio_capture
#[repr(C)]
struct AudioCaptureConfig {
    // Microphone config (offsets 0-3)
    mic_state: *mut SharedState,
    mic_format: *const AudioFormat,
    mic_extra: [u64; 2],

    // Reference counter (offset 4)
    ref_counter: *mut AtomicI64,

    // Shared state pointer (offset 5)
    shared_state: *mut SharedState,

    // Loopback config (offsets 6-10)
    loopback_state: *mut SharedState,
    loopback_format: *const AudioFormat,
    loopback_extra: [u64; 3],
}
```

---

## FUN_1800156b0 - Get Audio Capture Status

**Address:** `0x1800156b0`
**Purpose:** Reads capture status flags and formats them for JavaScript

### Key Discovery:
The function reads from **TWO separate SharedState structures**:
- `param_2[0]` → Microphone SharedState
- `param_2[1]` → Loopback SharedState

### Reconstructed Rust Pseudocode:

```rust
/// Gets the current audio capture status
///
/// # Arguments
/// * `output` - Output buffer for status
/// * `states` - Pointer to array of [mic_state, loopback_state]
///
/// # Returns
/// * Formatted status string (for logging) and boolean flags
fn get_audio_capture_status(
    output: &mut StatusResult,
    states: &[*mut SharedState; 2],
) -> &mut StatusResult {
    // ========================================
    // Read Microphone State
    // ========================================
    let mic_state = unsafe { &mut *states[0] };

    // Acquire lock (offset 0x10)
    loop {
        let old = mic_state.lock.compare_exchange(0, 1);
        if old == 0 { break; }
        wait_on_address(&mic_state.lock);
    }

    // Check for errors (offset 0x11)
    if mic_state.error_flag != 0 {
        panic!("called `Result::unwrap()` on an `Err` value");
    }

    // Read capture active flag (offset 0x12)
    let is_mic_active = mic_state.is_active;

    // Release lock
    mic_state.lock.store(0);
    wake_by_address_single(&mic_state.lock);

    // ========================================
    // Read Loopback State
    // ========================================
    let loopback_state = unsafe { &mut *states[1] };

    // Acquire lock (offset 0x10)
    loop {
        let old = loopback_state.lock.compare_exchange(0, 1);
        if old == 0 { break; }
        wait_on_address(&loopback_state.lock);
    }

    // Check for errors (offset 0x11)
    if loopback_state.error_flag != 0 {
        panic!("called `Result::unwrap()` on an `Err` value");
    }

    // Read capture active flag (offset 0x12)
    let is_loopback_active = loopback_state.is_active;

    // Release lock
    loopback_state.lock.store(0);
    wake_by_address_single(&loopback_state.lock);

    // ========================================
    // Format Output
    // ========================================
    // Debug log format: "is_mic_capture_active: {}, is_loopback_capture_active: {}"
    format_debug_output(
        output,
        is_mic_active,
        is_loopback_active,
    );

    output
}
```

### Key Offsets Confirmed:
| Offset | Field | Type | Purpose |
|--------|-------|------|---------|
| 0x10 | `lock` | AtomicU8 | Thread synchronization |
| 0x11 | `error_flag` | u8 | Error indicator |
| 0x12 | `is_active` | bool | **Capture active flag** |

### Returned Status Object (to JavaScript):
```typescript
interface AudioCaptureStatus {
    isCapturing: boolean;        // mic_active || loopback_active
    microphoneActive: boolean;   // SharedState[0].is_active
    systemAudioActive: boolean;  // SharedState[1].is_active
}
```

---

## Stop Audio Capture Flow (Inferred)

Based on analysis, the stop flow is:

```
JavaScript: audioCapture.stopAudioCapture()
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ Handler: LAB_180009330                                       │
│   1. Parse callback info (get 'this')                       │
│   2. Access native SharedState from 'this'                  │
└────────────────────────────────────┬────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Set Stop Flag                                                │
│   shared_state[0].is_active = false  // Stop mic            │
│   shared_state[1].is_active = false  // Stop loopback       │
│   OR                                                         │
│   Set should_stop flag that threads check                   │
└────────────────────────────────────┬────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Capture Threads (FUN_1800121d0)                             │
│   - Check stop condition via FUN_180027810                  │
│   - Break out of capture loop                               │
│   - Log: "] Stopping audio capture..."                      │
│   - Cleanup resources                                       │
│   - Log: "Audio capture stopped."                           │
└─────────────────────────────────────────────────────────────┘
```

### Log Messages During Stop:
| String | Purpose |
|--------|---------|
| `"] Stopping audio capture..."` | Stop initiated |
| `"] Error stopping audio client: "` | Error during stop |
| `"error] Audio capture stopped."` | Stop complete |

---

## Additional Analyzed Functions

### FUN_1800348b0 - Thread Local Storage Access

**Address:** `0x1800348b0`
**Purpose:** Accesses thread-local storage for module state

```rust
/// Returns pointer to thread-local module state
fn get_tls_state() -> *mut ModuleState {
    // Access Thread Local Storage (TLS)
    // GS:0x58 points to TLS array
    // _tls_index is the module's TLS slot
    let tls_array = unsafe { *(GS_OFFSET + 0x58) as *const *mut u8 };
    let tls_slot = unsafe { *tls_array.offset(_tls_index as isize) };
    (tls_slot + 8) as *mut ModuleState
}
```

### FUN_18000c730 - Parse Callback Info (No Arguments)

**Address:** `0x18000c730`
**Purpose:** Parses N-API callback info for methods with no arguments

- Uses `napi_get_cb_info` (PTR_PTR_180080598 + 0x1b0)
- Extracts `this` object from JavaScript
- Creates reference if needed

### FUN_18000ca50 - Parse Callback Function Argument

**Address:** `0x18000ca50`
**Purpose:** Parses a JavaScript callback function argument

- Uses `napi_get_cb_info` to get arguments
- Uses `napi_create_reference` (offset 0x1f0) to prevent GC of callback
- Error: "Failed to initialize napi function call."
- Error: "Failed to create reference for `this` in async class factory"

---

## Complete Function Analysis Summary

### ✅ Core Audio Functions (Fully Analyzed)
| Function | Address | Purpose |
|----------|---------|---------|
| `FUN_1800121d0` | 0x1800121d0 | Main audio capture thread |
| `FUN_180027ef0` | 0x180027ef0 | Device/resampler initialization |
| `FUN_180028a50` | 0x180028a50 | Create IMFMediaType |
| `FUN_1800284d0` | 0x1800284d0 | Process/resample audio buffer |
| `FUN_180005510` | 0x180005510 | Send audio to JS callback |
| `FUN_180027810` | 0x180027810 | Check stop flag |

### ✅ Thread Coordination (Fully Analyzed)
| Function | Address | Purpose |
|----------|---------|---------|
| `UndefinedFunction_18000e990` | 0x18000e990 | Start capture coordinator |
| `FUN_18001e710` | 0x18001e710 | Spawn microphone thread |
| `FUN_18001e740` | 0x18001e740 | Spawn loopback thread |

### ✅ N-API Infrastructure (Fully Analyzed)
| Function | Address | Purpose |
|----------|---------|---------|
| `UndefinedFunction_180009ca0` | 0x180009ca0 | Class method registration |
| `FUN_18000c730` | 0x18000c730 | Parse callback info (no args) |
| `FUN_18000ca50` | 0x18000ca50 | Parse callback with function arg |
| `FUN_1800319d0` | 0x1800319d0 | Parse boolean argument |
| `FUN_18001f680` | 0x18001f680 | N-API return handler |
| `FUN_18001f4c0` | 0x18001f4c0 | Error result constructor |
| `FUN_1800348b0` | 0x1800348b0 | TLS access |

### ✅ N-API Handlers (Thin Wrappers)
| Handler | Address | Calls |
|---------|---------|-------|
| `constructor` | LAB_180008760 | FUN_18000c730 → FUN_18001f680 |
| `startAudioCapture` | LAB_180008f20 | FUN_18000c3b0 → FUN_1800319d0 → FUN_18001f680 |
| `stopAudioCapture` | LAB_180009330 | FUN_18000c730 → FUN_18001f680 |
| `getAudioCaptureStatus` | LAB_180009560 | FUN_18000c730 → FUN_18001f680 |
| `setGlobalLogFunction` | LAB_1800099f0 | FUN_18000ca50 → FUN_18001f680 |
| `requestMicrophonePermission` | LAB_1800088a0 | FUN_18000ca50 → FUN_18001f680 |
| `requestSystemAudioPermission` | LAB_180008ba0 | FUN_18000ca50 → FUN_18001f680 |
| `crashAudioCapture` | LAB_1800097f0 | Debug trigger |

---

## What's Left to Explore (Low Priority)

### Still Not Fully Traced:
| Component | Status | Notes |
|-----------|--------|-------|
| `getAudioCaptureStatus` implementation | ⚠️ Handler known | Need to find where status flags are read |
| `crashAudioCapture` implementation | ⚠️ Handler known | Debug function, likely panics |
| Stop flag SETTER | ⚠️ Partial | Need to find where `should_stop` is set |
| Log callback storage | ⚠️ Partial | Know how parsed, not where stored |

### Utility Functions (Not Critical):
| Function | Purpose |
|----------|---------|
| `FUN_180028c60` | Extract buffer data from IMFSample |
| `FUN_1800578b0` | memcpy implementation |
| `FUN_18003a650` | Release COM object |
| `FUN_18003b2c0` | Get HRESULT error info |
| `FUN_18003a510` | IMFMediaType::SetGUID wrapper |
| `FUN_18003a4e0` | IMFMediaType::SetUINT32 wrapper |

---

## Coverage Assessment

### What We Understand:
- ✅ Complete audio capture flow (start → capture → resample → callback → stop)
- ✅ Thread spawning architecture (coordinator → 2 threads)
- ✅ Media Foundation usage (device enum, audio client, resampler)
- ✅ N-API class structure and method registration
- ✅ ThreadsafeFunction for cross-thread JS callbacks
- ✅ Reference counting and cleanup patterns
- ✅ SharedState structure with exact offsets (0x10=lock, 0x11=error, 0x12=is_active)
- ✅ getAudioCaptureStatus implementation (reads from 2 SharedState instances)

### What's Missing for 100% Recreation:
1. ~~**getAudioCaptureStatus** - How the 3 boolean flags are read~~ ✅ FOUND
2. **Stop mechanism** - Exact function that sets `is_active = false`
3. **Error handling details** - Some edge cases
4. **Exact COM GUIDs** - Need to extract from binary data sections

### Estimated Coverage: **~95%**

We have enough to implement a fully working Rust audio capture module. The remaining 5% is mostly:
- Exact stop setter (can be inferred)
- Utility functions (trivial to reimplement)
- COM GUIDs (from Windows SDK)

---

## Final Summary

### Total Functions Analyzed: **25+**

| Category | Functions Analyzed |
|----------|-------------------|
| Core Audio | 6 (capture thread, device init, resampler, buffer processing) |
| Thread Management | 3 (coordinator, mic spawner, loopback spawner) |
| N-API Infrastructure | 7 (handlers, parsers, TLS) |
| Status/Control | 2 (getAudioCaptureStatus, check stop flag) |
| Handlers | 8 (all exported methods) |

### Key Discoveries:
1. **Two-thread architecture** - Separate threads for mic and loopback
2. **SharedState structure** - Confirmed offsets 0x10/0x11/0x12
3. **Media Foundation resampler** - Uses IMFTransform for sample rate conversion
4. **ThreadsafeFunction** - For cross-thread JavaScript callbacks
5. **Atomic lock** - Uses WaitOnAddress/WakeByAddressSingle for synchronization

---

*Last Updated: 2026-01-03 17:20*
*Analysis Tool: Ghidra 11.4*
*Total Functions Analyzed: 25+*
*Coverage: ~95%*
