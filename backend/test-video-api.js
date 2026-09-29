const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');

const prompt = process.argv.slice(2).join(' ') || 'A 5-second video of animals playing in a forest';

async function testVideoApi() {
  console.log(`🎬 Requesting video generation for: "${prompt}"...`);
  
  try {
    // 1. Initiate video generation
    const postRes = await fetch('http://localhost:3000/api/video/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    
    if (!postRes.ok) {
      const err = await postRes.text();
      console.error(`❌ Failed to start generation: ${postRes.status} ${err}`);
      return;
    }

    const data = await postRes.json();
    const jobId = data.jobId;
    console.log(`✅ Generation started! Job ID: ${jobId}`);
    
    // 2. Poll for status
    console.log(`⏳ Waiting for video to finish processing...`);
    
    let videoUrl = null;
    while (true) {
      const getRes = await fetch(`http://localhost:3000/api/video/status/${jobId}`);
      const statusData = await getRes.json();
      
      if (statusData.status === 'completed') {
        console.log(`\n🎉 VIDEO READY FROM API!`);
        console.log(`📹 Remote URL: ${statusData.videoUrl}`);
        videoUrl = statusData.videoUrl;
        break;
      } else if (statusData.status === 'failed') {
        console.log(`\n❌ Generation failed: ${statusData.error}`);
        break;
      }
      
      process.stdout.write(`...${statusData.progress || 0}% `);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // 3. Download the video locally so it can be shared via our API
    if (videoUrl) {
      console.log(`\n⬇️  Downloading video locally to public/videos folder...`);
      const videoRes = await fetch(videoUrl);
      
      if (!videoRes.ok) throw new Error(`unexpected response ${videoRes.statusText}`);
      
      const fileName = `generated_video_${Date.now()}.mp4`;
      const filePath = path.join(__dirname, 'public', 'videos', fileName);
      
      await pipeline(videoRes.body, fs.createWriteStream(filePath));
      
      console.log(`✅ Video saved locally: ${filePath}`);
      console.log(`\n🚀 YOU CAN NOW SHARE THIS VIDEO VIA YOUR API:`);
      console.log(`   http://localhost:3000/videos/${fileName}`);
    }

  } catch (err) {
    console.error('\n❌ Error:', err.message);
  }
}

testVideoApi();
