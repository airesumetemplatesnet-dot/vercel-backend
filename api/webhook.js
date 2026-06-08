const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "Art_Private_NO";
const PLAN_MAP = {
  "1119907": "basic",
  "1119908": "pro",
  "1119917": "premium",
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const eventName = req.body?.meta?.event_name;
    const customerEmail = req.body?.data?.attributes?.user_email || 
                          req.body?.data?.attributes?.customer_email;
    const variantId = req.body?.data?.attributes?.variant_id;
    const status = req.body?.data?.attributes?.status;

    console.log('Webhook received:', eventName, customerEmail, variantId);

    let plan = "basic";
    if (variantId) {
      plan = PLAN_MAP[String(variantId)] || "basic";
    }

    if (customerEmail) {
      const fbKey = process.env.FIREBASE_API_KEY;
      if (fbKey) {
        const planData = {
          fields: {
            email: { stringValue: customerEmail },
            plan: { stringValue: eventName === 'subscription_cancelled' ? 'free' : plan },
            status: { stringValue: status || 'active' },
            updatedAt: { stringValue: new Date().toISOString() },
            event: { stringValue: eventName }
          }
        };

        const docId = encodeURIComponent(customerEmail);
        await fetch(
          `https://firestore.googleapis.com/v1/projects/airesumetemplates/databases/(default)/documents/subscriptions/${docId}?key=${fbKey}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(planData)
          }
        );
      }
    }

    return res.status(200).json({ 
      success: true, 
      event: eventName,
      email: customerEmail,
      plan: plan
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: error.message });
  }
}
