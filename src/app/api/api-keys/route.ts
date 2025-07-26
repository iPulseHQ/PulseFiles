import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';
import { nanoid } from 'nanoid';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Get user's API keys
export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: apiKeys, error } = await supabase
      .from('api_keys')
      .select('id, name, key_preview, created_at, last_used, is_active')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 });
    }

    return NextResponse.json({ apiKeys: apiKeys || [] });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create new API key
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name } = await request.json();
    
    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'API key name is required' }, { status: 400 });
    }

    // Generate API key
    const apiKey = `pf_${nanoid(32)}`;
    const keyPreview = `${apiKey.substring(0, 12)}...${apiKey.substring(apiKey.length - 4)}`;

    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        user_id: userId,
        name: name.trim(),
        api_key: apiKey,
        key_preview: keyPreview,
        created_at: new Date().toISOString(),
        is_active: true
      })
      .select('id, name, key_preview, created_at')
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
    }

    return NextResponse.json({
      apiKey: {
        ...data,
        full_key: apiKey // Only returned on creation
      }
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete API key
export async function DELETE(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('id');
    
    if (!keyId) {
      return NextResponse.json({ error: 'API key ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', keyId)
      .eq('user_id', userId);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}