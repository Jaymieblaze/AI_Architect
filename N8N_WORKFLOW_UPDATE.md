# 🔧 n8n Workflow Update Instructions - Multi-Angle Coherence

## ⚠️ CURRENT STATUS

**Frontend**: ✅ Ready (seed + imageUrls enabled)  
**n8n Workflow**: ❌ Needs manual update  
**Result**: Currently generates **4 different buildings** instead of 4 views of the same building

---

## 🎯 Goal: Get 4 Coherent Views of the SAME Building

The multi-angle feature needs the n8n workflow to forward `seed` and `imageUrls` parameters to the Krea API.

---

## 📋 Step-by-Step Fix (5 minutes)

### Step 1: Open n8n Workflow Editor

1. Go to http://localhost:5678
2. Click on **"My workflow"** to open it
3. You should see nodes: Webhook → Krea AI Generator → Respond to Webhook

### Step 2: Update the HTTP Request Node

1. **Click on the "Krea AI Generator" node** (the HTTP Request node that calls Krea API)
2. Scroll down to find the **"Body Parameters"** or **"JSON Body"** field

### Step 3: Replace JSON Body with Expression

The current JSON Body probably looks like this:

```json
{
  "prompt": "Architectural render of {{$json.body.user_prompt}}, photorealistic...",
  "width": 1024,
  "height": 576,
  "steps": 28
}
```

**Replace it with this Expression Mode code:**

1. Click the **gear icon** ⚙️ next to "JSON Body" field
2. Select **"Expression"** mode (instead of "Fixed")
3. **Delete everything** in the field
4. **Paste this code:**

```javascript
={{
  const body = {
    "prompt": $json.body.user_prompt,
    "width": 1024,
    "height": 576,
    "steps": 28
  };
  
  // Forward seed if provided (for multi-angle coherence)
  if ($json.body.seed !== undefined && $json.body.seed !== null) {
    body.seed = $json.body.seed;
  }
  
  // Forward imageUrls if provided (for img2img reference)
  if ($json.body.imageUrls && Array.isArray($json.body.imageUrls) && $json.body.imageUrls.length > 0) {
    body.imageUrls = $json.body.imageUrls;
  }
  
  return body;
}}
```

### Step 4: Save the Workflow

1. Click **"Save"** button in the top-right corner
2. The workflow is now updated! ✅

---

## ✅ Verification

### Console Logs to Watch

After the update, when you generate multi-angle views, you should see in the browser console:

```
Using seed for coherence: 1234567890
Generating exterior with seed + exterior reference
```

### Expected Behavior

- **Before fix**: 4 completely different building designs
- **After fix**: 4 views (exterior, interior, aerial, detail) of the SAME building

---

## 🧪 Test the Fix

1. Go to your frontend app (http://localhost:3000)
2. Toggle to **"4-Angle View"** mode
3. Enter a simple prompt: `"modern glass beach house"`
4. Click **"Generate Concept"**
5. Wait for all 4 images to generate
6. **Result**: All 4 angles should show the same building architecture! 🎉

---

## 🔍 Troubleshooting

### Still getting 4 different buildings?

1. **Check n8n workflow was saved**: Refresh the workflow in n8n to confirm changes persisted
2. **Check Expression mode**: Make sure the field shows `=` icon (Expression) not `{}` (JSON)
3. **Check console logs**: Open browser DevTools → Console, look for "Using seed for coherence: [number]"
4. **Restart n8n**: If needed, restart the Docker container

### Images not generating at all?

1. **Check n8n is running**: Docker container should be active on port 5678
2. **Check webhook URL**: In `.env.local`, verify `N8N_WEBHOOK_URL` points to the correct workflow
3. **Check Krea API key**: Verify `KREA_API_KEY` is set in n8n workflow credentials

---

## 📝 Technical Details

### What Changed?

**Before**: n8n workflow only forwarded `user_prompt`  
**After**: n8n workflow forwards `user_prompt`, `seed`, and `imageUrls`

### How Multi-Angle Works Now:

1. Frontend generates a **random seed** (e.g., 1234567890)
2. Frontend sends request with `{ user_prompt, seed }` to n8n
3. n8n forwards **both** to Krea API
4. Krea uses the seed to generate **consistent** architecture across all 4 angles

### Image-to-Image Reference (Future Enhancement):

The `imageUrls` parameter enables the "exterior-first" strategy:
1. Generate exterior view first
2. Use exterior image as reference for other 3 angles
3. Ensures even better coherence (same exact building)

Currently, this generates 4 angles **in parallel** with the same seed for speed.

---

## ✨ Success Criteria

After this update, you should be able to:

- ✅ Generate 4-angle views with **consistent building design**
- ✅ See the same architectural style, colors, and proportions across all angles
- ✅ Use multi-angle mode for professional architectural presentations

---

## 📌 Note

The frontend code has already been updated to send `seed` and `imageUrls`. This n8n workflow update is the **only remaining step** to enable multi-angle coherence.

---

## How it Works:

1. **Single Image Mode**: 
   - Frontend sends: `{ user_prompt: "...", seed: 123456 }`
   - n8n forwards seed to Krea AI
   
2. **Multi-Angle Mode - Exterior**:
   - Frontend sends: `{ user_prompt: "exterior view...", seed: 123456 }`
   - n8n generates exterior with seed
   
3. **Multi-Angle Mode - Other Angles**:
   - Frontend sends: `{ user_prompt: "interior view...", seed: 123456, imageUrls: ["https://...exterior.png"] }`
   - n8n uses exterior image as reference (img2img) with same seed
   - Result: Coherent building across all 4 angles!

---

## Troubleshooting

### If you see "Failed to generate exterior view" error:
- Make sure you've kept `useAdvancedFeatures = false` until n8n is updated
- The current error means n8n doesn't understand the new parameters yet
- Complete Step 1 (update n8n), then Step 2 (enable feature flag)

### If angles are still different buildings after enabling:
- Check n8n execution logs to verify seed + imageUrls are being passed
- Verify the workflow JSON Body includes the conditional seed/imageUrls logic
- Check browser console for errors during generation

### If img2img isn't working:
- The Flux model supports img2img via `imageUrls` parameter
- Make sure the exterior URL is publicly accessible
- Check that the URL starts with `https://`
- Wait 20-30 seconds for exterior to fully complete before other angles start
