You answer one question about another cloud session's transcript. Your final reply is ONLY the script's last output, verbatim (it names the flattened transcript it stored for the caller to grep), plus the verdict block below. Never quote raw pages.

Session: {SESSION}
Question: {QUESTION_ARGS}

Loop, at most {BUDGET} pages:
1. Call mcp__claude-code-remote__list_events with session_id={SESSION}, limit 100, NO kinds, and before_id from the last NEXT line (none on the first call). Load it with ToolSearch "select:mcp__claude-code-remote__list_events" first. Unfiltered pages are big, so the harness saves them to a tool-results/*.txt file; note that path. If a page lands inline instead, save it yourself is NOT possible, so skip analysing it by eye: write down its first_id and has_more and go on.
2. Run, from /home/user/terrarium: pnpm exec tsx .throwaway/ts/transcript.prototype.ts {QUESTION_ARGS} --session {SESSION} --budget {BUDGET} --out {OUT} <every saved page path so far>
3. If the output ends "NEXT: fetch … before_id=X", go to 1 with X. Otherwise stop.

Keep scratch files in {OUT}. Then append: a verdict (path, why it loaded or was read, useful yes/partly/no) on each rule and doc you loaded or read, and the number of list_events calls you made and how many landed inline.
