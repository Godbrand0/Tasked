(use-trait sip-010-trait .sip-010-trait-ft.sip-010-trait)

;; Error Codes
(define-constant ERR-NOT-AUTHORIZED (err u1001))
(define-constant ERR-USER-ALREADY-REGISTERED (err u1002))
(define-constant ERR-USER-NOT-REGISTERED (err u1003))
(define-constant ERR-INVALID-ROLE (err u1004))
(define-constant ERR-INVALID-EXPERIENCE (err u1005))
(define-constant ERR-COOLDOWN-ACTIVE (err u1006))
(define-constant ERR-INVALID-AMOUNT (err u1007))
(define-constant ERR-TASK-NOT-FOUND (err u1008))
(define-constant ERR-INVALID-STATUS (err u1009))
(define-constant ERR-EXPERIENCE-MISMATCH (err u1010))
(define-constant ERR-ALREADY-APPLIED (err u1011))
(define-constant ERR-NOT-APPLIED (err u1012))
(define-constant ERR-INVALID-ASSIGNEE (err u1013))
(define-constant ERR-DEADLINE-NOT-PASSED (err u1014))
(define-constant ERR-DEADLINE-PASSED (err u1015))
(define-constant ERR-INSUFFICIENT-FUNDS (err u1016))
(define-constant ERR-INVALID-TOKEN (err u1017))
(define-constant ERR-INVALID-VOTE (err u1018))
(define-constant ERR-VOTING-CLOSED (err u1019))
(define-constant ERR-VOTING-OPEN (err u1020))
(define-constant ERR-ALREADY-VOTED (err u1021))
(define-constant ERR-NO-STAKE (err u1022))
(define-constant ERR-WAVE-NOT-FINISHED (err u1023))
(define-constant ERR-ALREADY-CLAIMED (err u1024))
(define-constant ERR-NO-REWARD (err u1025))
(define-constant ERR-INVALID-WAVE (err u1026))
(define-constant ERR-STX-STAKE-TOO-LOW (err u1027))

;; Constants
(define-constant CONTRACT-OWNER tx-sender)

(define-constant SELF-FUNDED-FEE-BPS u300)    ;; 3%
(define-constant GRANT-FUNDED-FEE-BPS u500)   ;; 5%
(define-constant TREASURY-SHARE u60)           ;; 60% of fee
(define-constant WAVE-POOL-SHARE u40)          ;; 40% of fee
(define-constant WAVE-EPOCH-BLOCKS u1008)      ;; ~7 days at 10 min/block
(define-constant GRANT-VOTING-BLOCKS u432)     ;; ~3 days
(define-constant MIN-TASK-AMOUNT u1000000)     ;; 1 USDX (6 decimals)
(define-constant MIN-STX-STAKE u1000000)       ;; 1 STX (6 decimals)
(define-constant STX-VOTE-MULTIPLIER u10)
(define-constant EXPERIENCE-UPDATE-COOLDOWN u144) ;; ~1 day

;; Experience Tiers
(define-constant TIER-NEWCOMER u0)   ;; 0-1 year
(define-constant TIER-JUNIOR u1)     ;; 1-2 years
(define-constant TIER-MID u2)        ;; 2-3 years
(define-constant TIER-SENIOR u3)     ;; 3-5 years
(define-constant TIER-EXPERT u4)     ;; 5+ years

;; Variables
(define-data-var treasury-address principal tx-sender)
(define-data-var next-task-id uint u1)

;; Wave Pool Variables
(define-data-var current-wave-id uint u1)
(define-data-var wave-start-block uint u0)
(define-data-var wave-pool-amount uint u0)
(define-data-var wave-total-tasks uint u0)

;; Grant Pool USDX balance stored in the contract
(define-data-var grant-pool-balance uint u0)

;; User profiles
(define-map users
  { address: principal }
  {
    username: (string-ascii 50),
    role: (string-ascii 12),          ;; "creator" | "contributor" | "investor"
    experience-level: uint,           ;; 0-4, contributors only
    tasks-completed: uint,
    total-earned: uint,
    github-verified: bool,
    registered-at: uint,
    last-experience-update: uint
  }
)

;; Tasks / bounties
(define-map tasks
  { task-id: uint }
  {
    creator: principal,
    title: (string-ascii 200),
    amount: uint,                     ;; Gross amount deposited
    token: principal,                 ;; SIP-010 token contract
    experience-min: uint,             ;; minimum experience tier (0-4)
    experience-max: uint,             ;; maximum experience tier (0-4)
    status: (string-ascii 20),
    funding-type: (string-ascii 10),  ;; "self" | "grant"
    assignee: (optional principal),
    deadline: uint,
    created-at: uint
  }
)

;; Task Applicants Map
(define-map task-applicants
  { task-id: uint, contributor: principal }
  { applied-at: uint }
)

;; Patron / investor profiles
(define-map patrons
  { address: principal }
  {
    total-deposited: uint,
    stx-staked: uint,
    tier: uint                        ;; 99=None 0=Bronze 1=Silver 2=Gold 3=Diamond
  }
)

;; Grant vote tallies
(define-map grant-votes
  { task-id: uint }
  {
    votes-for: uint,
    votes-against: uint,
    deadline: uint,
    executed: bool
  }
)

;; Grant Voters Map (prevent double voting)
(define-map grant-voters
  { task-id: uint, voter: principal }
  { voted: bool }
)

;; Wave Snapshots Map
(define-map wave-snapshots
  { wave-id: uint }
  { pool-amount: uint, total-tasks: uint }
)

;; Wave Claims Map
(define-map wave-claims
  { wave-id: uint, creator: principal }
  { claimed: bool }
)

;; Wave Creator Tasks count Map
(define-map wave-creator-tasks
  { wave-id: uint, creator: principal }
  { task-count: uint }
)

;; Private Helpers

(define-private (calculate-tier (amount uint))
  (if (>= amount u5000000000)
    u3 ;; Diamond
    (if (>= amount u1000000000)
      u2 ;; Gold
      (if (>= amount u50000000) ;; Wait, Silver is 500 USDX = u500000000
        (if (>= amount u500000000)
          u1 ;; Silver
          (if (>= amount u100000000)
            u0 ;; Bronze
            u99 ;; None
          )
        )
        u99
      )
    )
  )
)

;; Read-Only Functions

(define-read-only (get-user (user principal))
  (map-get? users { address: user })
)

(define-read-only (get-task (task-id uint))
  (map-get? tasks { task-id: task-id })
)

(define-read-only (get-patron (patron principal))
  (map-get? patrons { address: patron })
)

(define-read-only (get-grant-vote (task-id uint))
  (map-get? grant-votes { task-id: task-id })
)

(define-read-only (get-task-applicant (task-id uint) (contributor principal))
  (map-get? task-applicants { task-id: task-id, contributor: contributor })
)

(define-read-only (get-grant-voter (task-id uint) (voter principal))
  (map-get? grant-voters { task-id: task-id, voter: voter })
)

(define-read-only (get-wave-snapshot (wave-id uint))
  (map-get? wave-snapshots { wave-id: wave-id })
)

(define-read-only (get-wave-creator-tasks (wave-id uint) (creator principal))
  (map-get? wave-creator-tasks { wave-id: wave-id, creator: creator })
)

(define-read-only (get-wave-claim (wave-id uint) (creator principal))
  (map-get? wave-claims { wave-id: wave-id, creator: creator })
)

(define-read-only (get-treasury-address)
  (var-get treasury-address)
)

(define-read-only (get-next-task-id)
  (var-get next-task-id)
)

(define-read-only (get-current-wave)
  {
    wave-id: (var-get current-wave-id),
    start-block: (var-get wave-start-block),
    pool-amount: (var-get wave-pool-amount),
    total-tasks: (var-get wave-total-tasks)
  }
)

(define-read-only (get-grant-pool-balance)
  (var-get grant-pool-balance)
)

;; User Registration Module

(define-public (register-user (username (string-ascii 50)) (role (string-ascii 12)) (experience-level uint) (github-verified bool))
  (let
    (
      (user-exists (is-some (map-get? users { address: tx-sender })))
    )
    (asserts! (not user-exists) ERR-USER-ALREADY-REGISTERED)
    (asserts! (or (is-eq role "creator") (or (is-eq role "contributor") (is-eq role "investor"))) ERR-INVALID-ROLE)
    (asserts! (<= experience-level TIER-EXPERT) ERR-INVALID-EXPERIENCE)

    (map-set users
      { address: tx-sender }
      {
        username: username,
        role: role,
        experience-level: (if (is-eq role "contributor") experience-level u0),
        tasks-completed: u0,
        total-earned: u0,
        github-verified: github-verified,
        registered-at: stacks-block-height,
        last-experience-update: stacks-block-height
      }
    )

    (if (is-eq role "investor")
      (map-set patrons
        { address: tx-sender }
        {
          total-deposited: u0,
          stx-staked: u0,
          tier: u99
        }
      )
      true
    )

    (ok true)
  )
)

(define-public (update-experience (new-tier uint))
  (let
    (
      (user (unwrap! (map-get? users { address: tx-sender }) ERR-USER-NOT-REGISTERED))
    )
    (asserts! (is-eq (get role user) "contributor") ERR-INVALID-ROLE)
    (asserts! (<= new-tier TIER-EXPERT) ERR-INVALID-EXPERIENCE)
    (asserts! (>= stacks-block-height (+ (get last-experience-update user) EXPERIENCE-UPDATE-COOLDOWN)) ERR-COOLDOWN-ACTIVE)

    (map-set users
      { address: tx-sender }
      (merge user {
        experience-level: new-tier,
        last-experience-update: stacks-block-height
      })
    )
    (ok true)
  )
)

;; Task Escrow Module

(define-public (create-task (title (string-ascii 200)) (amount uint) (token-trait <sip-010-trait>) (experience-min uint) (experience-max uint) (deadline uint))
  (let
    (
      (user (unwrap! (map-get? users { address: tx-sender }) ERR-USER-NOT-REGISTERED))
      (task-id (var-get next-task-id))
      (token (contract-of token-trait))
      (fee (/ (* amount SELF-FUNDED-FEE-BPS) u10000))
      (treasury-fee (/ (* fee TREASURY-SHARE) u100))
      (wave-pool-fee (- fee treasury-fee))
      (net-amount (- amount fee))
      (current-wave (var-get current-wave-id))
    )
    (asserts! (is-eq (get role user) "creator") ERR-INVALID-ROLE)
    (asserts! (>= amount MIN-TASK-AMOUNT) ERR-INVALID-AMOUNT)
    (asserts! (<= experience-min experience-max) ERR-INVALID-EXPERIENCE)
    (asserts! (<= experience-max TIER-EXPERT) ERR-INVALID-EXPERIENCE)
    (asserts! (> deadline stacks-block-height) ERR-DEADLINE-PASSED)

    ;; Transfer tokens from creator
    (try! (contract-call? token-trait transfer amount tx-sender (as-contract tx-sender) none))

    ;; Handle fees
    (if (is-eq token .usdx-token)
      (begin
        ;; Split USDX fees between treasury and wave pool
        (as-contract (try! (contract-call? token-trait transfer treasury-fee tx-sender (var-get treasury-address) none)))
        (var-set wave-pool-amount (+ (var-get wave-pool-amount) wave-pool-fee))
        ;; Track creator's tasks in this wave for rewards
        (var-set wave-total-tasks (+ (var-get wave-total-tasks) u1))
        (let
          (
            (creator-stats (default-to { task-count: u0 } (map-get? wave-creator-tasks { wave-id: current-wave, creator: tx-sender })))
          )
          (map-set wave-creator-tasks
            { wave-id: current-wave, creator: tx-sender }
            { task-count: (+ (get task-count creator-stats) u1) }
          )
        )
      )
      ;; Non-USDX tokens transfer 100% of the fee to treasury
      (as-contract (try! (contract-call? token-trait transfer fee tx-sender (var-get treasury-address) none)))
    )

    ;; Store task details
    (map-set tasks
      { task-id: task-id }
      {
        creator: tx-sender,
        title: title,
        amount: amount,
        token: token,
        experience-min: experience-min,
        experience-max: experience-max,
        status: "OPEN",
        funding-type: "self",
        assignee: none,
        deadline: deadline,
        created-at: stacks-block-height
      }
    )

    (var-set next-task-id (+ task-id u1))
    (ok task-id)
  )
)

;; Grant Pool & Staking Module

(define-public (deposit-to-pool (amount uint) (usdx-token <sip-010-trait>))
  (let
    (
      (user (unwrap! (map-get? users { address: tx-sender }) ERR-USER-NOT-REGISTERED))
      (patron (unwrap! (map-get? patrons { address: tx-sender }) ERR-USER-NOT-REGISTERED))
      (new-total (+ (get total-deposited patron) amount))
    )
    (asserts! (is-eq (contract-of usdx-token) .usdx-token) ERR-INVALID-TOKEN)
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)

    ;; Transfer USDX to contract
    (try! (contract-call? usdx-token transfer amount tx-sender (as-contract tx-sender) none))

    ;; Update pool balance and patron details
    (var-set grant-pool-balance (+ (var-get grant-pool-balance) amount))
    (map-set patrons
      { address: tx-sender }
      (merge patron {
        total-deposited: new-total,
        tier: (calculate-tier new-total)
      })
    )
    (ok true)
  )
)

(define-public (stake-stx (amount uint))
  (let
    (
      (patron (unwrap! (map-get? patrons { address: tx-sender }) ERR-USER-NOT-REGISTERED))
    )
    (asserts! (>= amount MIN-STX-STAKE) ERR-STX-STAKE-TOO-LOW)

    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))

    (map-set patrons
      { address: tx-sender }
      (merge patron {
        stx-staked: (+ (get stx-staked patron) amount)
      })
    )
    (ok true)
  )
)

(define-public (unstake-stx (amount uint))
  (let
    (
      (patron (unwrap! (map-get? patrons { address: tx-sender }) ERR-USER-NOT-REGISTERED))
      (staked (get stx-staked patron))
    )
    (asserts! (>= staked amount) ERR-INSUFFICIENT-FUNDS)

    (let
      (
        (caller tx-sender)
      )
      (as-contract (try! (stx-transfer? amount tx-sender caller)))
    )

    (map-set patrons
      { address: tx-sender }
      (merge patron {
        stx-staked: (- staked amount)
      })
    )
    (ok true)
  )
)

;; Grant Proposal & Voting Module

(define-public (apply-for-grant (title (string-ascii 200)) (amount uint) (experience-min uint) (experience-max uint))
  (let
    (
      (user (unwrap! (map-get? users { address: tx-sender }) ERR-USER-NOT-REGISTERED))
      (task-id (var-get next-task-id))
    )
    (asserts! (is-eq (get role user) "creator") ERR-INVALID-ROLE)
    (asserts! (>= amount MIN-TASK-AMOUNT) ERR-INVALID-AMOUNT)
    (asserts! (<= experience-min experience-max) ERR-INVALID-EXPERIENCE)
    (asserts! (<= experience-max TIER-EXPERT) ERR-INVALID-EXPERIENCE)

    (map-set tasks
      { task-id: task-id }
      {
        creator: tx-sender,
        title: title,
        amount: amount,
        token: .usdx-token,
        experience-min: experience-min,
        experience-max: experience-max,
        status: "GRANT_PENDING",
        funding-type: "grant",
        assignee: none,
        deadline: (+ stacks-block-height GRANT-VOTING-BLOCKS),
        created-at: stacks-block-height
      }
    )

    (map-set grant-votes
      { task-id: task-id }
      {
        votes-for: u0,
        votes-against: u0,
        deadline: (+ stacks-block-height GRANT-VOTING-BLOCKS),
        executed: false
      }
    )

    (var-set next-task-id (+ task-id u1))
    (ok task-id)
  )
)

(define-public (vote-on-grant (task-id uint) (support bool))
  (let
    (
      (task (unwrap! (map-get? tasks { task-id: task-id }) ERR-TASK-NOT-FOUND))
      (vote (unwrap! (map-get? grant-votes { task-id: task-id }) ERR-TASK-NOT-FOUND))
      (patron (unwrap! (map-get? patrons { address: tx-sender }) ERR-NO-STAKE))
      (voted-already (default-to false (get voted (map-get? grant-voters { task-id: task-id, voter: tx-sender }))))
      (weight (+ (get total-deposited patron) (get stx-staked patron))) ;; Wait, STX multiplier is applied: total-deposited + (stx-staked * multiplier)
      (voting-weight (+ (get total-deposited patron) (* (get stx-staked patron) STX-VOTE-MULTIPLIER)))
    )
    (asserts! (is-eq (get status task) "GRANT_PENDING") ERR-INVALID-STATUS)
    (asserts! (< stacks-block-height (get deadline vote)) ERR-VOTING-CLOSED)
    (asserts! (not (get executed vote)) ERR-VOTING-CLOSED)
    (asserts! (not voted-already) ERR-ALREADY-VOTED)
    (asserts! (> voting-weight u0) ERR-NO-STAKE)

    (map-set grant-voters
      { task-id: task-id, voter: tx-sender }
      { voted: true }
    )

    (map-set grant-votes
      { task-id: task-id }
      (merge vote {
        votes-for: (if support (+ (get votes-for vote) voting-weight) (get votes-for vote)),
        votes-against: (if support (get votes-against vote) (+ (get votes-against vote) voting-weight))
      })
    )
    (ok true)
  )
)

(define-public (execute-grant (task-id uint) (usdx-token <sip-010-trait>))
  (let
    (
      (task (unwrap! (map-get? tasks { task-id: task-id }) ERR-TASK-NOT-FOUND))
      (vote (unwrap! (map-get? grant-votes { task-id: task-id }) ERR-TASK-NOT-FOUND))
      (amount (get amount task))
      (current-wave (var-get current-wave-id))
    )
    (asserts! (is-eq (contract-of usdx-token) .usdx-token) ERR-INVALID-TOKEN)
    (asserts! (is-eq (get status task) "GRANT_PENDING") ERR-INVALID-STATUS)
    (asserts! (>= stacks-block-height (get deadline vote)) ERR-VOTING-OPEN)
    (asserts! (not (get executed vote)) ERR-VOTING-CLOSED)

    (map-set grant-votes
      { task-id: task-id }
      (merge vote { executed: true })
    )

    (if (> (get votes-for vote) (get votes-against vote))
      (begin
        (asserts! (>= (var-get grant-pool-balance) amount) ERR-INSUFFICIENT-FUNDS)
        ;; Deduct from grant pool balance
        (var-set grant-pool-balance (- (var-get grant-pool-balance) amount))

        ;; Fee split at execution (5%)
        (let
          (
            (fee (/ (* amount GRANT-FUNDED-FEE-BPS) u10000))
            (treasury-fee (/ (* fee TREASURY-SHARE) u100))
            (wave-pool-fee (- fee treasury-fee))
          )
          (as-contract (try! (contract-call? usdx-token transfer treasury-fee tx-sender (var-get treasury-address) none)))
          (var-set wave-pool-amount (+ (var-get wave-pool-amount) wave-pool-fee))
          
          ;; Track tasks for wave rewards
          (var-set wave-total-tasks (+ (var-get wave-total-tasks) u1))
          (let
            (
              (creator-stats (default-to { task-count: u0 } (map-get? wave-creator-tasks { wave-id: current-wave, creator: (get creator task) })))
            )
            (map-set wave-creator-tasks
              { wave-id: current-wave, creator: (get creator task) }
              { task-count: (+ (get task-count creator-stats) u1) }
            )
          )
        )

        (map-set tasks
          { task-id: task-id }
          (merge task {
            status: "OPEN",
            deadline: (+ stacks-block-height u4320) ;; Reset deadline for implementation (e.g. ~30 days)
          })
        )
        (ok true)
      )
      (begin
        (map-set tasks
          { task-id: task-id }
          (merge task { status: "GRANT_REJECTED" })
        )
        (ok false)
      )
    )
  )
)

;; Task Lifecycle Module

(define-public (apply-for-task (task-id uint))
  (let
    (
      (contributor (unwrap! (map-get? users { address: tx-sender }) ERR-USER-NOT-REGISTERED))
      (task (unwrap! (map-get? tasks { task-id: task-id }) ERR-TASK-NOT-FOUND))
      (already-applied (is-some (map-get? task-applicants { task-id: task-id, contributor: tx-sender })))
      (exp (get experience-level contributor))
    )
    (asserts! (is-eq (get role contributor) "contributor") ERR-INVALID-ROLE)
    (asserts! (is-eq (get status task) "OPEN") ERR-INVALID-STATUS)
    (asserts! (and (>= exp (get experience-min task)) (<= exp (get experience-max task))) ERR-EXPERIENCE-MISMATCH)
    (asserts! (not already-applied) ERR-ALREADY-APPLIED)

    (map-set task-applicants
      { task-id: task-id, contributor: tx-sender }
      { applied-at: stacks-block-height }
    )
    (ok true)
  )
)

(define-public (assign-task (task-id uint) (assignee principal))
  (let
    (
      (task (unwrap! (map-get? tasks { task-id: task-id }) ERR-TASK-NOT-FOUND))
      (applied (is-some (map-get? task-applicants { task-id: task-id, contributor: assignee })))
    )
    (asserts! (is-eq (get creator task) tx-sender) ERR-NOT-AUTHORIZED)
    (asserts! (is-eq (get status task) "OPEN") ERR-INVALID-STATUS)
    (asserts! applied ERR-NOT-APPLIED)

    (map-set tasks
      { task-id: task-id }
      (merge task {
        status: "ASSIGNED",
        assignee: (some assignee)
      })
    )
    (ok true)
  )
)

(define-public (start-task (task-id uint))
  (let
    (
      (task (unwrap! (map-get? tasks { task-id: task-id }) ERR-TASK-NOT-FOUND))
      (assignee (unwrap! (get assignee task) ERR-INVALID-ASSIGNEE))
    )
    (asserts! (is-eq assignee tx-sender) ERR-NOT-AUTHORIZED)
    (asserts! (is-eq (get status task) "ASSIGNED") ERR-INVALID-STATUS)

    (map-set tasks
      { task-id: task-id }
      (merge task { status: "IN_PROGRESS" })
    )
    (ok true)
  )
)

(define-public (submit-task (task-id uint))
  (let
    (
      (task (unwrap! (map-get? tasks { task-id: task-id }) ERR-TASK-NOT-FOUND))
      (assignee (unwrap! (get assignee task) ERR-INVALID-ASSIGNEE))
    )
    (asserts! (is-eq assignee tx-sender) ERR-NOT-AUTHORIZED)
    (asserts! (is-eq (get status task) "IN_PROGRESS") ERR-INVALID-STATUS)

    (map-set tasks
      { task-id: task-id }
      (merge task { status: "SUBMITTED" })
    )
    (ok true)
  )
)

(define-public (approve-and-release (task-id uint) (token-trait <sip-010-trait>))
  (let
    (
      (task (unwrap! (map-get? tasks { task-id: task-id }) ERR-TASK-NOT-FOUND))
      (assignee (unwrap! (get assignee task) ERR-INVALID-ASSIGNEE))
      (amount (get amount task))
      (fee-bps (if (is-eq (get funding-type task) "self") SELF-FUNDED-FEE-BPS GRANT-FUNDED-FEE-BPS))
      (fee (/ (* amount fee-bps) u10000))
      (net-amount (- amount fee))
      (assignee-profile (unwrap! (map-get? users { address: assignee }) ERR-USER-NOT-REGISTERED))
    )
    (asserts! (is-eq (get creator task) tx-sender) ERR-NOT-AUTHORIZED)
    (asserts! (is-eq (get status task) "SUBMITTED") ERR-INVALID-STATUS)
    (asserts! (is-eq (contract-of token-trait) (get token task)) ERR-INVALID-TOKEN)

    ;; Transfer escrow funds to assignee
    (as-contract (try! (contract-call? token-trait transfer net-amount tx-sender assignee none)))

    ;; Update task status
    (map-set tasks
      { task-id: task-id }
      (merge task { status: "FUNDS_RELEASED" })
    )

    ;; Update contributor stats
    (map-set users
      { address: assignee }
      (merge assignee-profile {
        tasks-completed: (+ (get tasks-completed assignee-profile) u1),
        total-earned: (+ (get total-earned assignee-profile) net-amount)
      })
    )
    (ok true)
  )
)

(define-public (cancel-task (task-id uint) (token-trait <sip-010-trait>))
  (let
    (
      (task (unwrap! (map-get? tasks { task-id: task-id }) ERR-TASK-NOT-FOUND))
      (amount (get amount task))
      (fee (/ (* amount SELF-FUNDED-FEE-BPS) u10000))
      (net-amount (- amount fee))
    )
    (asserts! (is-eq (get creator task) tx-sender) ERR-NOT-AUTHORIZED)
    (asserts! (is-eq (get status task) "OPEN") ERR-INVALID-STATUS)
    (asserts! (is-eq (get funding-type task) "self") ERR-NOT-AUTHORIZED)
    (asserts! (is-eq (contract-of token-trait) (get token task)) ERR-INVALID-TOKEN)

    ;; Refund net escrow amount to creator
    (as-contract (try! (contract-call? token-trait transfer net-amount tx-sender (get creator task) none)))

    (map-set tasks
      { task-id: task-id }
      (merge task { status: "CANCELLED" })
    )
    (ok true)
  )
)

(define-public (mark-expired (task-id uint) (token-trait <sip-010-trait>))
  (let
    (
      (task (unwrap! (map-get? tasks { task-id: task-id }) ERR-TASK-NOT-FOUND))
      (status (get status task))
      (amount (get amount task))
      (fee-bps (if (is-eq (get funding-type task) "self") SELF-FUNDED-FEE-BPS GRANT-FUNDED-FEE-BPS))
      (fee (/ (* amount fee-bps) u10000))
      (net-amount (- amount fee))
    )
    (asserts! (not (is-eq status "FUNDS_RELEASED")) ERR-INVALID-STATUS)
    (asserts! (not (is-eq status "CANCELLED")) ERR-INVALID-STATUS)
    (asserts! (not (is-eq status "EXPIRED")) ERR-INVALID-STATUS)
    (asserts! (not (is-eq status "GRANT_REJECTED")) ERR-INVALID-STATUS)
    (asserts! (> stacks-block-height (get deadline task)) ERR-DEADLINE-NOT-PASSED)
    (asserts! (is-eq (contract-of token-trait) (get token task)) ERR-INVALID-TOKEN)

    (if (is-eq (get funding-type task) "self")
      ;; Refund to creator
      (as-contract (try! (contract-call? token-trait transfer net-amount tx-sender (get creator task) none)))
      ;; Refund to grant pool
      (begin
        (asserts! (is-eq (contract-of token-trait) .usdx-token) ERR-INVALID-TOKEN)
        (var-set grant-pool-balance (+ (var-get grant-pool-balance) net-amount))
      )
    )

    (map-set tasks
      { task-id: task-id }
      (merge task { status: "EXPIRED" })
    )
    (ok true)
  )
)

;; Wave Rewards Module

(define-public (advance-wave)
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (asserts! (>= stacks-block-height (+ (var-get wave-start-block) WAVE-EPOCH-BLOCKS)) ERR-WAVE-NOT-FINISHED)

    ;; Snapshot current wave
    (map-set wave-snapshots
      { wave-id: (var-get current-wave-id) }
      {
        pool-amount: (var-get wave-pool-amount),
        total-tasks: (var-get wave-total-tasks)
      }
    )

    ;; Start new wave
    (var-set current-wave-id (+ (var-get current-wave-id) u1))
    (var-set wave-start-block stacks-block-height)
    (var-set wave-pool-amount u0)
    (var-set wave-total-tasks u0)
    (ok true)
  )
)

(define-public (claim-wave-reward (wave-id uint) (usdx-token <sip-010-trait>))
  (let
    (
      (claimant tx-sender)
      (snapshot (unwrap! (map-get? wave-snapshots { wave-id: wave-id }) ERR-INVALID-WAVE))
      (creator-stats (unwrap! (map-get? wave-creator-tasks { wave-id: wave-id, creator: claimant }) ERR-NO-REWARD))
      (already-claimed (default-to false (get claimed (map-get? wave-claims { wave-id: wave-id, creator: claimant }))))
      (reward (/ (* (get pool-amount snapshot) (get task-count creator-stats)) (get total-tasks snapshot)))
    )
    (asserts! (is-eq (contract-of usdx-token) .usdx-token) ERR-INVALID-TOKEN)
    (asserts! (< wave-id (var-get current-wave-id)) ERR-INVALID-WAVE)
    (asserts! (not already-claimed) ERR-ALREADY-CLAIMED)
    (asserts! (> reward u0) ERR-NO-REWARD)

    (map-set wave-claims
      { wave-id: wave-id, creator: claimant }
      { claimed: true }
    )

    (as-contract (try! (contract-call? usdx-token transfer reward tx-sender claimant none)))
    (ok reward)
  )
)

;; Owner Settings

(define-public (set-treasury-address (new-treasury principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (var-set treasury-address new-treasury)
    (ok true)
  )
)
