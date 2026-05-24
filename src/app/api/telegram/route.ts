import { NextRequest, NextResponse } from "next/server";

// Helper to send a message back to Telegram
async function sendTelegramMessage(botToken: string, chatId: number | string, text: string, options: any = {}) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "Markdown",
        ...options,
      }),
    });
    return await res.json();
  } catch (error) {
    console.error("Error sending Telegram message:", error);
    return null;
  }
}

// Helper to answer callback query
async function answerCallbackQuery(botToken: string, callbackQueryId: string, text?: string) {
  const url = `https://api.telegram.org/bot${botToken}/answerCallbackQuery`;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text,
      }),
    });
  } catch (error) {
    console.error("Error answering callback query:", error);
  }
}

// Helper to trigger GitHub Repository Dispatch
async function triggerGitHubWorkflow(pat: string, repo: string, action: string, slug?: string, feedback?: string) {
  const url = `https://api.github.com/repos/${repo}/dispatches`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "Nextjs-Telegram-Webhook",
      },
      body: JSON.stringify({
        event_type: "telegram_trigger",
        client_payload: {
          action: action,
          slug: slug || "",
          feedback: feedback || "",
        },
      }),
    });
    return res.status === 204;
  } catch (error) {
    console.error("Error triggering GitHub workflow:", error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const myChatId = process.env.TELEGRAM_MY_CHAT_ID;
  const githubPat = process.env.GITHUB_PAT;
  const githubRepo = process.env.GITHUB_REPOSITORY;

  if (!botToken || !myChatId) {
    return NextResponse.json({ error: "Missing Bot Token or Chat ID config" }, { status: 500 });
  }

  try {
    const body = await req.json();
    console.log("Received Telegram Webhook Update:", JSON.stringify(body));

    // Extract sender chat ID
    let senderId: number | string | null = null;
    let message = body.message;
    let callbackQuery = body.callback_query;

    if (message) {
      senderId = message.chat.id;
    } else if (callbackQuery) {
      senderId = callbackQuery.from.id;
    }

    // 1. Security check: strictly validate that sender chat ID matches the environment configuration
    if (!senderId || String(senderId) !== String(myChatId)) {
      console.log(`Security Block: Update ignored from unauthorized sender ID: ${senderId}`);
      return NextResponse.json({ status: "ignored" });
    }

    // 2. Process Callback Queries (Inline buttons)
    if (callbackQuery) {
      const callbackData = callbackQuery.data || "";
      const callbackQueryId = callbackQuery.id;
      const slug = callbackData.split(":")[1];

      if (callbackData.startsWith("publish:")) {
        await answerCallbackQuery(botToken, callbackQueryId, "Publishing draft...");

        if (!githubPat || !githubRepo || githubPat === "placeholder_pat") {
          await sendTelegramMessage(
            botToken,
            myChatId,
            "⚠️ *GitHub credentials missing!* Please configure `GITHUB_PAT` and `GITHUB_REPOSITORY` environment variables in your deployment dashboard."
          );
          return NextResponse.json({ status: "done" });
        }

        // Use GitHub Contents API to update draft: false directly (serverless publication!)
        const filePath = `posts/${slug}.md`;
        const getUrl = `https://api.github.com/repos/${githubRepo}/contents/${filePath}`;
        
        try {
          // Fetch existing file
          const getRes = await fetch(getUrl, {
            headers: {
              Authorization: `Bearer ${githubPat}`,
              Accept: "application/vnd.github+json",
              "User-Agent": "Nextjs-Telegram-Webhook",
            },
          });

          if (!getRes.ok) {
            await sendTelegramMessage(botToken, myChatId, `❌ Could not find file posts/${slug}.md in GitHub repository.`);
            return NextResponse.json({ status: "done" });
          }

          const fileData = await getRes.json();
          const sha = fileData.sha;
          const originalText = Buffer.from(fileData.content, "base64").toString("utf-8");

          // Parse and rewrite front-matter draft: true to draft: false
          let updatedText = originalText;
          if (originalText.includes("draft: true")) {
            updatedText = originalText.replace("draft: true", "draft: false");
          } else if (originalText.includes("draft:true")) {
            updatedText = originalText.replace("draft:true", "draft:false");
          }

          // Push update back to GitHub
          const putRes = await fetch(getUrl, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${githubPat}`,
              Accept: "application/vnd.github+json",
              "User-Agent": "Nextjs-Telegram-Webhook",
            },
            body: JSON.stringify({
              message: `Publish newsletter: ${slug}`,
              content: Buffer.from(updatedText).toString("base64"),
              sha: sha,
            }),
          });

          if (putRes.ok) {
            await sendTelegramMessage(
              botToken,
              myChatId,
              `🎉 *Newsletter published successfully!*\nSlug: \`${slug}\`\nIt is now live on the production website!`
            );
          } else {
            const putErr = await putRes.text();
            console.error("GitHub PUT error:", putErr);
            await sendTelegramMessage(botToken, myChatId, `❌ Failed to update file on GitHub. API status code: ${putRes.status}`);
          }

        } catch (err: any) {
          console.error("Error during publishing process:", err);
          await sendTelegramMessage(botToken, myChatId, `❌ Error publishing newsletter: ${err.message}`);
        }

        return NextResponse.json({ status: "done" });
      }

      if (callbackData.startsWith("edit:")) {
        await answerCallbackQuery(botToken, callbackQueryId);
        
        // Ask user for edit details and force a Telegram Reply input block
        await sendTelegramMessage(
          botToken,
          myChatId,
          `📝 Please reply directly to this message with your edits/feedback for the draft \`${slug}\`:`,
          {
            reply_markup: {
              force_reply: true,
              selective: true,
            },
          }
        );
        return NextResponse.json({ status: "done" });
      }
    }

    // 3. Process standard commands or replies
    if (message && message.text) {
      const text = message.text.trim();

      // Trigger standard generation
      if (text === "/run") {
        if (!githubPat || !githubRepo || githubPat === "placeholder_pat") {
          await sendTelegramMessage(
            botToken,
            myChatId,
            "⚠️ *GitHub credentials missing!* Please configure `GITHUB_PAT` and `GITHUB_REPOSITORY` environment variables in your deployment dashboard to run research."
          );
          return NextResponse.json({ status: "done" });
        }

        await sendTelegramMessage(
          botToken,
          myChatId,
          "🤖 *Research machine activated!* Digging through this week's game dev data... please wait."
        );

        const ok = await triggerGitHubWorkflow(githubPat, githubRepo, "generate");
        if (!ok) {
          await sendTelegramMessage(botToken, myChatId, "❌ Failed to trigger GitHub Action workflow. Please check your credentials.");
        }
        return NextResponse.json({ status: "done" });
      }

      // Check if this message is a reply to our editing prompt
      if (message.reply_to_message && message.reply_to_message.text) {
        const repliedText = message.reply_to_message.text;
        
        // Regex search to extract slug: "edits/feedback for the draft [slug_name]:"
        const slugRegex = /for the draft \`?([a-zA-Z0-9_-]+)\`?:/;
        const match = repliedText.match(slugRegex);

        if (match && match[1]) {
          const slug = match[1];
          const feedback = text;

          if (!githubPat || !githubRepo || githubPat === "placeholder_pat") {
            await sendTelegramMessage(
              botToken,
              myChatId,
              "⚠️ *GitHub credentials missing!* Please configure environment variables to submit edits."
            );
            return NextResponse.json({ status: "done" });
          }

          await sendTelegramMessage(
            botToken,
            myChatId,
            `🤖 *Feedback received!* Refining the draft for \`${slug}\`... please wait.`
          );

          const ok = await triggerGitHubWorkflow(githubPat, githubRepo, "edit", slug, feedback);
          if (!ok) {
            await sendTelegramMessage(botToken, myChatId, "❌ Failed to trigger GitHub Action editing workflow.");
          }
        } else {
          await sendTelegramMessage(
            botToken,
            myChatId,
            "ℹ️ Reply detected, but could not identify the target draft slug. Make sure you reply to the specific draft edit prompt."
          );
        }
        return NextResponse.json({ status: "done" });
      }
    }

    return NextResponse.json({ status: "unhandled" });

  } catch (error: any) {
    console.error("Error in Telegram webhook endpoint:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
