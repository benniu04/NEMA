import ffmpeg from 'fluent-ffmpeg';
// @ts-ignore
import ffmpegPath from 'ffmpeg-static';
// @ts-ignore
import ffprobeStatic from 'ffprobe-static';
import path from 'path';
import fs from 'fs';
import logger from '../config/logger.js';

// Set static paths for FFmpeg and FFprobe
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath as unknown as string);
}
if (ffprobeStatic && ffprobeStatic.path) {
  ffmpeg.setFfprobePath(ffprobeStatic.path as unknown as string);
}

export interface TranscodeResult {
  masterPlaylistPath: string;
  outputDir: string;
  variants: QualityVariant[];
}

export interface QualityVariant {
  resolution: string;
  bandwidth: number;
  playlistPath: string;
}

interface QualityConfig {
  name: string;
  resolution: string;
  videoBitrate: string;
  audioBitrate: string;
  bandwidth: number;
  maxrate: string;
  bufsize: string;
}

/**
 * Transcodes a video file to HLS format with adaptive bitrate streaming (multiple quality levels)
 * Creates 360p, 480p, 720p, and 1080p variants (if source quality allows)
 */
export const transcodeToHLS = (inputPath: string, outputDir: string): Promise<TranscodeResult> => {
  return new Promise(async (resolve, reject) => {
    try {
      // Ensure output directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      logger.info('Starting adaptive bitrate HLS transcoding', { inputPath, outputDir });

      // Get video metadata to determine source resolution
      const metadata = await getVideoMetadata(inputPath);
      const sourceHeight = metadata.height || 1080;

      // Define quality variants
      const qualityConfigs: QualityConfig[] = [
        {
          name: '360p',
          resolution: '640x360',
          videoBitrate: '800k',
          audioBitrate: '96k',
          bandwidth: 900000,
          maxrate: '856k',
          bufsize: '1200k'
        },
        {
          name: '480p',
          resolution: '854x480',
          videoBitrate: '1400k',
          audioBitrate: '128k',
          bandwidth: 1600000,
          maxrate: '1498k',
          bufsize: '2100k'
        },
        {
          name: '720p',
          resolution: '1280x720',
          videoBitrate: '2800k',
          audioBitrate: '128k',
          bandwidth: 3200000,
          maxrate: '2996k',
          bufsize: '4200k'
        },
        {
          name: '1080p',
          resolution: '1920x1080',
          videoBitrate: '5000k',
          audioBitrate: '192k',
          bandwidth: 5500000,
          maxrate: '5350k',
          bufsize: '7500k'
        }
      ];

      // Filter variants based on source resolution
      const applicableVariants = qualityConfigs.filter(config => {
        const targetHeight = parseInt(config.resolution.split('x')[1]);
        return targetHeight <= sourceHeight;
      });

      if (applicableVariants.length === 0) {
        throw new Error('Source video resolution too low for transcoding');
      }

      logger.info('Transcoding variants', { 
        sourceHeight, 
        variants: applicableVariants.map(v => v.name) 
      });

      // Transcode each variant
      const variants: QualityVariant[] = [];
      for (const config of applicableVariants) {
        const variantDir = path.join(outputDir, config.name);
        fs.mkdirSync(variantDir, { recursive: true });
        
        await transcodeVariant(inputPath, variantDir, config);
        
        variants.push({
          resolution: config.name,
          bandwidth: config.bandwidth,
          playlistPath: path.join(config.name, 'playlist.m3u8')
        });
      }

      // Create master playlist
      const masterPlaylistPath = path.join(outputDir, 'master.m3u8');
      createMasterPlaylist(masterPlaylistPath, variants);

      logger.info('Adaptive bitrate HLS transcoding completed', { 
        masterPlaylistPath,
        variantsCount: variants.length 
      });

      resolve({ masterPlaylistPath, outputDir, variants });
    } catch (error) {
      logger.error('Error during adaptive HLS transcoding', { error: (error as Error).message });
      reject(error);
    }
  });
};

/**
 * Get video metadata using ffprobe
 */
const getVideoMetadata = (inputPath: string): Promise<{ width: number; height: number; duration: number }> => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }

      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      if (!videoStream) {
        reject(new Error('No video stream found'));
        return;
      }

      resolve({
        width: videoStream.width || 1920,
        height: videoStream.height || 1080,
        duration: metadata.format.duration || 0
      });
    });
  });
};

/**
 * Transcode a single quality variant
 */
const transcodeVariant = (
  inputPath: string, 
  outputDir: string, 
  config: QualityConfig
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const playlistPath = path.join(outputDir, 'playlist.m3u8');
    const segmentPattern = path.join(outputDir, 'segment_%03d.ts');

    logger.info(`Transcoding ${config.name} variant`, { outputDir });

    ffmpeg(inputPath)
      .outputOptions([
        `-vf scale=${config.resolution}`,
        '-c:v libx264',
        '-preset medium',
        '-profile:v main',
        '-level 4.0',
        `-b:v ${config.videoBitrate}`,
        `-maxrate ${config.maxrate}`,
        `-bufsize ${config.bufsize}`,
        '-c:a aac',
        `-b:a ${config.audioBitrate}`,
        '-ac 2',
        '-ar 48000',
        '-start_number 0',
        '-hls_time 6',
        '-hls_list_size 0',
        '-hls_segment_type mpegts',
        '-f hls',
        '-hls_flags independent_segments',
        `-hls_segment_filename ${segmentPattern}`
      ])
      .output(playlistPath)
      .on('start', (commandLine) => {
        logger.debug(`FFmpeg command for ${config.name}:`, commandLine);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          logger.debug(`${config.name}: ${Math.round(progress.percent)}% done`);
        }
      })
      .on('end', () => {
        logger.info(`${config.name} variant completed`, { playlistPath });
        resolve();
      })
      .on('error', (err) => {
        logger.error(`Error transcoding ${config.name}`, { error: err.message });
        reject(err);
      })
      .run();
  });
};

/**
 * Create master playlist that references all quality variants
 */
const createMasterPlaylist = (masterPath: string, variants: QualityVariant[]): void => {
  let content = '#EXTM3U\n#EXT-X-VERSION:3\n\n';

  for (const variant of variants) {
    const resolution = variant.resolution === '360p' ? '640x360' :
                      variant.resolution === '480p' ? '854x480' :
                      variant.resolution === '720p' ? '1280x720' :
                      '1920x1080';
    
    content += `#EXT-X-STREAM-INF:BANDWIDTH=${variant.bandwidth},RESOLUTION=${resolution}\n`;
    content += `${variant.playlistPath}\n\n`;
  }

  fs.writeFileSync(masterPath, content, 'utf-8');
  logger.info('Master playlist created', { masterPath, variantsCount: variants.length });
};

