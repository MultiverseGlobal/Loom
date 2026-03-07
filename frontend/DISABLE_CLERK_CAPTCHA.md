# How to Disable Cloudflare Captcha in Clerk

I've already updated the code to use email verification, but you should also disable bot protection in Clerk Dashboard for smoother testing.

## Steps to Disable in Clerk Dashboard:

1. **Go to Clerk Dashboard**  
   https://dashboard.clerk.com

2. **Select your application**  
   Click on the app you created

3. **Navigate to User & Authentication**  
   Look in the left sidebar

4. **Click on "Attack Protection"**

5. **Find "Bot sign-up protection"**  
   Should be under the Attack Protection section

6. **Set to "Off" or "None"**  
   Toggle or select dropdown to disable

7. **Save Changes**

## What This Does:

✅ Removes Cloudflare Turnstile captcha  
✅ Makes signup/login faster in development  
✅ No "verifying you're human" step  

⚠️ **For Production**: Turn it back ON to prevent spam signups!

## Alternative If You Can't Find It:

If the setting isn't there, the code change I made should work on its own. Clerk will use email verification codes instead of captcha.

---

**Note**: The server has been restarted with the email verification code. Try signing up now - it should skip the Cloudflare verification!
