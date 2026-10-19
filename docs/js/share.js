// 記録の持ち主と、「よしよし」の届いた状況の判定。

// 記録を入力できるのは、記録の持ち主だけ。ほかの人が持ち主の記録があれば、見るだけの画面にする。
// 持ち主のいない記録(古い版で作ったもの)は、だれのものでもないので、制限しない。
export function canRecord(owners, me) {
  return [...owners].every((o) => !o || o === me);
}

// まだ見ていない、他の人からの「よしよし」(新しい順)
export function unseenPats(pats, me, seenAt) {
  return pats
    .filter((p) => p.by !== me && p.at > seenAt)
    .sort((a, b) => b.at - a.at);
}
