# Taskify Public API

A read-only feed of Taskify tasks for bots and integrations, such as a Discord quest board. No key or sign-in needed.

## Endpoint

```
GET https://www.taskifybounties.com/api/public/tasks
GET https://www.taskifybounties.com/api/public/tasks?status=open
```

- Without `status`, it returns every task, newest first.
- With `status`, it returns only tasks with that status. Case doesn't matter. An unknown status returns `400` with the list of valid ones.

Responses are cached for about 60 seconds, so polling every 1–2 minutes is plenty. If the chain can't be read, you get `503`; just try again on the next poll.

## Response

```json
{
  "tasks": [
    {
      "id": 9,
      "title": "Guide: how to bridge MEZO, MUSD and mUSDC out of Mezo",
      "kind": "community",
      "status": "FUNDS_RELEASED",
      "reward": "400",
      "token": "MEZO",
      "winners": 3,
      "deadline": 1793404800,
      "createdAt": 1791389967,
      "creator": "Eregha Thompson",
      "snippet": "Write a step-by-step guide covering…",
      "url": "https://www.taskifybounties.com/tasks/9",
      "paidTo": ["lily", "0x9e10…b8b", "samuel"],
      "paidEach": "129.333333333333333333",
      "payoutTx": "https://explorer.mezo.org/tx/0xabc…"
    }
  ]
}
```

| Field | Meaning |
|---|---|
| `id` | Task number. Stable, use it as your key. |
| `title` | Task title. |
| `kind` | `community` (anyone can join, no code needed) or `development` (one contributor, experience-gated). |
| `status` | See below. |
| `reward` | Total reward locked for the task, as a decimal string. |
| `token` | `MUSD` or `MEZO`. |
| `winners` | Community tasks only: how many people get paid. `null` for development tasks. |
| `deadline` | Unix seconds, or `null` if not set yet. |
| `createdAt` | Unix seconds. |
| `creator` | Creator's display name, on-chain username, or short address. |
| `snippet` | Plain-text start of the description (up to about 200 characters). Can be empty. |
| `url` | Link to the task. Discord shows a preview card for it automatically. |
| `paidTo` | Once paid: who received the reward, as names or short addresses. Otherwise `null`. |
| `paidEach` | Once paid: amount each person received, after Taskify's fee. Otherwise `null`. |
| `payoutTx` | Once paid: explorer link to the payout transaction, when recorded. Otherwise `null`. |

## Statuses

| Status | Meaning | Quest board |
|---|---|---|
| `OPEN` | Accepting applicants or participants | Post it and keep it up |
| `ASSIGNED`, `IN_PROGRESS`, `SUBMITTED` | Development task taken by a contributor | Remove the post |
| `FUNDS_RELEASED` | Paid out | Announce the payout, then remove the post |
| `CANCELLED`, `EXPIRED` | Closed without payout | Remove the post |
| `GRANT_PENDING`, `GRANT_REJECTED` | Grant-funded task waiting on, or rejected by, the community vote | Ignore |

## Suggested bot loop

1. Every 1–2 minutes, fetch `/api/public/tasks`.
2. For each task, compare `status` with what you saw last time (keyed by `id`).
3. If the task is new or became `OPEN`, post it.
4. If it changed to `FUNDS_RELEASED`, post a payout message using `paidTo`, `paidEach`, `token` and `payoutTx`, then remove the quest post.
5. For any other change, remove the quest post.

## Notes

- `paidTo` is always filled for paid development tasks. For community tasks, the winner list and `payoutTx` come from Taskify's records of the payout. If those are missing, `paidTo` is `null` even though the status is `FUNDS_RELEASED`. Fall back to a plain "this task has been paid out" message with the task `url`.
- The feed contains only public information: on-chain task data, the task description and display names.
