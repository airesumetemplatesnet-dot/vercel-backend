const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "Art_Private_NO";
const PLAN_MAP = {
  // Map LemonSqueezy variant IDs to plan names
  // Basic $1
  "af3df36f-4310-43eb-a479-98d0a2ee5e0c": "basic",
  // Pro $5
  "d697f911-b28a-40ef-b3f0-7b464ef121cd": "pro",
  // Premium $49
  "97556aac-011d-4e7e-ad01-917289a1195a": "premium",
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const signature = req.headers['x-signature'];
    const body = JSON.stringify(req.body);
    const eventName = req.body?.meta?.event_name;
    const customerEmail = req.body?.data?.attributes?.user_email || 
                          req.body?.data?.attributes?.customer_email;
    const productId = req.body?.data?.attributes?.product_id;
    const variantId = req.body?.data?.attributes?.variant_id;
    const status = req.body?.data?.attributes?.status;

    console.log('Webhook received:', eventName, customerEmail);

    // Determine plan from variant
    let plan = "basic";
    if (variantId) {
      plan = PLAN_MAP[String(variantId)] || "basic";
    }

    // Store subscription data in Firebase
    if (customerEmail) {
      const fbKey = process.env.FIREBASE_API_KEY;
      if (fbKey) {
        // Update user plan in Firebase Firestore via REST
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
