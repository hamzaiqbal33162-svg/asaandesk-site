Third-party code in this folder (unchanged copies of the published ESM builds):

- ffmpeg/       @ffmpeg/ffmpeg 0.12.10 (dist/esm), MIT, (c) 2019 Jerome Wu.
                https://github.com/ffmpegwasm/ffmpeg.wasm
                https://registry.npmjs.org/@ffmpeg/ffmpeg/-/ffmpeg-0.12.10.tgz
- ffmpeg-util/  @ffmpeg/util 0.12.1 (dist/esm), MIT, (c) 2019 Jerome Wu.
                https://registry.npmjs.org/@ffmpeg/util/-/util-0.12.1.tgz

Same versions the AsaanDesk site already uses for its converter tools (lib/media.ts).
The ffmpeg core (@ffmpeg/core 0.12.6, ~31 MB wasm) is NOT stored here: like the site's
converter tools it is downloaded from https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm only
when someone exports or converts to MP4. The core is FFmpeg built with x264 and other
codecs (GPL-2.0-or-later); see https://github.com/ffmpegwasm/ffmpeg.wasm.
