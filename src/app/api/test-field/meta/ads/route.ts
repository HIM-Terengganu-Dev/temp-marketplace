import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: Request) {
    const token = process.env.FB_ACCESS_TOKEN;
    if (!token) {
        return NextResponse.json({ error: 'FB_ACCESS_TOKEN is missing.' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');
    const adSetId = searchParams.get('adSetId');

    if (!campaignId && !adSetId) {
        return NextResponse.json({ error: 'campaignId or adSetId is required.' }, { status: 400 });
    }

    try {
        const target = adSetId ? adSetId : campaignId;
        const fields = 'id,name,status,effective_status,adset_id,creative{id,name,title,body,image_url,thumbnail_url,video_id,image_hash,object_story_spec,asset_feed_spec},created_time,updated_time';
        const url = `https://graph.facebook.com/v19.0/${target}/ads?fields=${fields}&limit=50&access_token=${token}`;

        const response = await axios.get(url);
        const ads = response.data.data || [];

        const formatted = ads.map((ad: any) => {
            const cr = ad.creative || {};
            // Extract media info from object_story_spec if present
            const storySpec = cr.object_story_spec || {};
            const linkData = storySpec.link_data || {};
            const videoData = storySpec.video_data || {};

            const headline = cr.title || linkData.name || videoData.title || '';
            const body = cr.body || linkData.message || videoData.message || '';
            const link = linkData.link || videoData.call_to_action?.value?.link || '';
            const thumbnail = cr.thumbnail_url || cr.image_url || videoData.image_url || linkData.picture || '';
            const isVideo = !!(cr.video_id || videoData.video_id || cr.thumbnail_url?.includes('fbcdn.net'));

            return {
                id: ad.id,
                name: ad.name,
                status: ad.status,
                effectiveStatus: ad.effective_status,
                adSetId: ad.adset_id,
                creativeId: cr.id,
                creativeName: cr.name,
                headline,
                body,
                destinationUrl: link,
                thumbnailUrl: thumbnail,
                isVideo,
                videoId: cr.video_id || videoData.video_id || null,
                imageHash: cr.image_hash || null,
                rawCreative: cr
            };
        });

        return NextResponse.json({
            success: true,
            ads: formatted
        });
    } catch (error: any) {
        console.error('Test Field Ads GET Error:', error.response?.data || error.message);
        return NextResponse.json({
            error: error.response?.data?.error?.message || error.message || 'Failed to fetch ads.'
        }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const token = process.env.FB_ACCESS_TOKEN;
    if (!token) {
        return NextResponse.json({ error: 'FB_ACCESS_TOKEN is missing.' }, { status: 400 });
    }

    try {
        const body = await request.json();
        const { adId, status, name, creativeId } = body;

        if (!adId) {
            return NextResponse.json({ error: 'adId is required.' }, { status: 400 });
        }

        const payload: Record<string, any> = {};
        if (status) {
            if (!['ACTIVE', 'PAUSED'].includes(status)) {
                return NextResponse.json({ error: 'Status must be ACTIVE or PAUSED.' }, { status: 400 });
            }
            payload.status = status;
        }

        if (name) {
            payload.name = name.trim();
        }

        if (creativeId) {
            payload.creative = { creative_id: creativeId };
        }

        if (Object.keys(payload).length === 0) {
            return NextResponse.json({ error: 'No update parameters specified.' }, { status: 400 });
        }

        const url = `https://graph.facebook.com/v19.0/${adId}`;
        const response = await axios.post(url, payload, {
            params: { access_token: token }
        });

        return NextResponse.json({
            success: true,
            adId,
            updated: payload,
            metaResult: response.data
        });
    } catch (error: any) {
        console.error('Test Field Ad Mutation Error:', error.response?.data || error.message);
        return NextResponse.json({
            error: error.response?.data?.error?.message || error.message || 'Failed to update ad.'
        }, { status: 500 });
    }
}
