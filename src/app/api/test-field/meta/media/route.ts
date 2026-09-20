import { NextResponse } from 'next/server';
import axios from 'axios';

/**
 * GET: Fetch ad account's media library (videos and images)
 */
export async function GET(request: Request) {
    const token = process.env.FB_ACCESS_TOKEN;
    if (!token) {
        return NextResponse.json({ error: 'FB_ACCESS_TOKEN is missing.' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    let adAccountId = searchParams.get('adAccountId') || 'act_1462603651298383';
    if (!adAccountId.startsWith('act_')) {
        adAccountId = `act_${adAccountId}`;
    }

    try {
        const [imagesRes, videosRes] = await Promise.allSettled([
            axios.get(`https://graph.facebook.com/v19.0/${adAccountId}/adimages?fields=hash,name,url,thumbnail_url,created_time&limit=25&access_token=${token}`),
            axios.get(`https://graph.facebook.com/v19.0/${adAccountId}/advideos?fields=id,title,description,thumbnails,created_time,status&limit=25&access_token=${token}`)
        ]);

        const images = imagesRes.status === 'fulfilled' ? imagesRes.value.data.data || [] : [];
        const videos = videosRes.status === 'fulfilled' ? videosRes.value.data.data || [] : [];

        const formattedImages = images.map((img: any) => ({
            type: 'image',
            id: img.hash,
            hash: img.hash,
            name: img.name || 'Untitled Image',
            url: img.url,
            thumbnailUrl: img.thumbnail_url || img.url,
            createdTime: img.created_time
        }));

        const formattedVideos = videos.map((v: any) => {
            const thumb = v.thumbnails?.data?.[0]?.uri || '';
            return {
                type: 'video',
                id: v.id,
                videoId: v.id,
                name: v.title || v.description || `Video ${v.id}`,
                url: null,
                thumbnailUrl: thumb,
                createdTime: v.created_time
            };
        });

        return NextResponse.json({
            success: true,
            adAccountId,
            media: [...formattedVideos, ...formattedImages]
        });
    } catch (error: any) {
        console.error('Test Field Media GET Error:', error.response?.data || error.message);
        return NextResponse.json({
            error: error.response?.data?.error?.message || error.message || 'Failed to fetch media assets.'
        }, { status: 500 });
    }
}

/**
 * POST: Create a new Creative definition on Meta using selected/uploaded media & copy,
 * then optionally attach it to an ad immediately.
 */
export async function POST(request: Request) {
    const token = process.env.FB_ACCESS_TOKEN;
    if (!token) {
        return NextResponse.json({ error: 'FB_ACCESS_TOKEN is missing.' }, { status: 400 });
    }

    try {
        const body = await request.json();
        const {
            adAccountId,
            pageId,
            adId,
            name,
            headline,
            message,
            linkUrl,
            mediaType, // 'video' | 'image'
            mediaId,   // video_id or image_hash
            imageUrl,  // optional fallback image url
            callToActionType // e.g. 'SHOP_NOW' | 'LEARN_MORE'
        } = body;

        let formattedAdAcc = adAccountId || 'act_1462603651298383';
        if (!formattedAdAcc.startsWith('act_')) {
            formattedAdAcc = `act_${formattedAdAcc}`;
        }

        const creativeName = name || `Creative Update ${Date.now()}`;
        const selectedPageId = pageId || '1187452187775404'; // Default to Himcoffee Dr Samhan Original page

        const storySpec: Record<string, any> = {
            page_id: selectedPageId,
        };

        if (mediaType === 'video' && mediaId) {
            storySpec.video_data = {
                video_id: mediaId,
                message: message || '',
                title: headline || '',
                call_to_action: {
                    type: callToActionType || 'SHOP_NOW',
                    value: {
                        link: linkUrl || 'https://shopee.com.my'
                    }
                }
            };
            if (imageUrl) {
                storySpec.video_data.image_url = imageUrl;
            }
        } else if (mediaType === 'image') {
            storySpec.link_data = {
                message: message || '',
                name: headline || '',
                link: linkUrl || 'https://shopee.com.my',
                call_to_action: {
                    type: callToActionType || 'SHOP_NOW',
                    value: {
                        link: linkUrl || 'https://shopee.com.my'
                    }
                }
            };
            if (mediaId) {
                storySpec.link_data.image_hash = mediaId;
            } else if (imageUrl) {
                storySpec.link_data.picture = imageUrl;
            }
        } else {
            // Default link data fallback
            storySpec.link_data = {
                message: message || '',
                name: headline || '',
                link: linkUrl || 'https://shopee.com.my',
                call_to_action: {
                    type: callToActionType || 'SHOP_NOW',
                    value: {
                        link: linkUrl || 'https://shopee.com.my'
                    }
                }
            };
        }

        // 1. Create Creative
        const createCreativeUrl = `https://graph.facebook.com/v19.0/${formattedAdAcc}/adcreatives`;
        console.log(`Creating new ad creative on Meta account ${formattedAdAcc}...`);

        const creativeRes = await axios.post(createCreativeUrl, {
            name: creativeName,
            object_story_spec: storySpec
        }, {
            params: { access_token: token }
        });

        const newCreativeId = creativeRes.data.id;
        console.log(`Created new creative ID: ${newCreativeId}`);

        // 2. If adId provided, immediately swap the creative on the target Ad
        let adUpdateResult = null;
        if (adId && newCreativeId) {
            console.log(`Updating Ad ${adId} with new creative ID ${newCreativeId}...`);
            const updateAdUrl = `https://graph.facebook.com/v19.0/${adId}`;
            const adRes = await axios.post(updateAdUrl, {
                creative: { creative_id: newCreativeId }
            }, {
                params: { access_token: token }
            });
            adUpdateResult = adRes.data;
        }

        return NextResponse.json({
            success: true,
            creativeId: newCreativeId,
            adId: adId || null,
            adUpdateResult
        });
    } catch (error: any) {
        console.error('Test Field Media & Creative Error:', error.response?.data || error.message);
        return NextResponse.json({
            error: error.response?.data?.error?.message || error.message || 'Failed to create creative or swap media on Meta.'
        }, { status: 500 });
    }
}
