# 🔧 Quick Fix: n8n Authorization Header

## Problem
Your n8n workflow is sending the Krea API key without the "Bearer " prefix, causing authentication to fail.

## Solution

1. **Open n8n** at http://localhost:5678
2. **Click on your workflow** ("My workflow")
3. **Click the "Krea AI Generator" node** (HTTP Request)
4. **Find the Headers section** → Authorization parameter
5. **Update the value** from:
   ```
   1d472440-da34-47ec-a366-e59238d5d4e6:r1b_AjxCfQP5gTMIaWOk5TZpgLwlScQ8
   ```
   
   To:
   ```
   Bearer 1d472440-da34-47ec-a366-e59238d5d4e6:r1b_AjxCfQP5gTMIaWOk5TZpgLwlScQ8
   ```
   
   (Add "Bearer " at the beginning)

6. **Save the workflow**
7. **Test again** in your app

## Why This Matters

The Krea API documentation requires:
```
Authorization: Bearer <api-key>
```

Without "Bearer ", Krea rejects the request, causing the "Backend failed to respond" error.

---

After fixing this, your single and multi-angle generation should work!
