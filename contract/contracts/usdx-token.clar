(impl-trait .sip-010-trait-ft.sip-010-trait)

(define-fungible-token usdx)

(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-authorized (err u101))

;; SIP-010 Transfer
(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  (begin
    (asserts! (is-eq tx-sender sender) err-not-authorized)
    (try! (ft-transfer? usdx amount sender recipient))
    (match memo to-print (print to-print) 0x)
    (ok true)
  )
)

;; SIP-010 Read-Only Functions
(define-read-only (get-name)
  (ok "USDX Token")
)

(define-read-only (get-symbol)
  (ok "USDX")
)

(define-read-only (get-decimals)
  (ok u6)
)

(define-read-only (get-balance (user principal))
  (ok (ft-get-balance usdx user))
)

(define-read-only (get-total-supply)
  (ok (ft-get-supply usdx))
)

(define-read-only (get-token-uri)
  (ok none)
)

;; Mint function for testing and faucet
(define-public (mint (amount uint) (recipient principal))
  (begin
    (try! (ft-mint? usdx amount recipient))
    (ok true)
  )
)
