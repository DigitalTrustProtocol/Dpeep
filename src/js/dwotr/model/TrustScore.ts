export const MAX_DEGREE = 2;

class TrustScore {
  result: number = 0;
  atDegree: number = 99;
  total: number = 0;

  trusts = [0,0,0] as number[];
  distrusts = [0,0,0] as number[];

  addValue(value: number, degree: number) {
    let indexDegree = degree-1;
    if (value > 0) this.trusts[indexDegree]++;
    if (value < 0) this.distrusts[indexDegree]++;

    if (degree > this.atDegree) return; // ignore higher degree scores
    if (degree < this.atDegree) {
      // reset lower degree scores
      this.result = 0;
      this.atDegree = degree;
      this.total = 0;
    }
    this.result = this.getValue(indexDegree); // add to result
    this.total = this.getCount(indexDegree); // increment total
  }

  getCount(degree: number) {
    return this.trusts[degree] + this.distrusts[degree];
  }

  getValue(degree: number) {
    return this.trusts[degree] - this.distrusts[degree];
  }

  values(): Array<number> {
    let result = Array(MAX_DEGREE + 1).fill(0) as number[];
    for (let i = 0; i <= MAX_DEGREE; i++) {
      result[i] = this.getValue(i);
    }
    return result;
  }

  // Returns true if the score is trusted by the observer
  isDirectTrusted() {
    return this.atDegree == 1 && this.result > 0;
  }

  isDirectDistrusted() {
    return this.atDegree == 1 && this.result < 0;
  }

  // Returns true if the score is trusted at the given degree
  // The result must be greater than 0 and the degree must be less than or equal to MAX_DEGREE
  // If the degree is 0, then it is trusted regardless of the result as its the observer themselves
  trusted() {
    return (this.result > 0 && this.atDegree <= MAX_DEGREE + 1) || this.atDegree == 0;
  }




  // Compare to old score and return true if changed
  // Only looks at the result, atDegree, and total not all the degrees
  hasChanged(oldScore: TrustScore | undefined): boolean {
    if (!oldScore) return this.total > 0;

    return (
      this.result != oldScore.result ||
      this.atDegree != oldScore.atDegree ||
      this.total != oldScore.total
    );
  }

  clone() {
    const clone = Object.create(Object.getPrototypeOf(this)) as TrustScore;
    //Object.assign(clone, this);
    clone.trusts = this.trusts.slice();
    clone.distrusts = this.distrusts.slice();
    return clone;
  }

  equals(other: TrustScore) {
    if (!other) return this.total > 0;

    if (this.hasChanged(other)) return false;

    for (let i = 0; i <= MAX_DEGREE; i++) {
      if (this.trusts[i] != other.trusts[i]) return false;
      if (this.distrusts[i] != other.distrusts[i]) return false;
    }
    return true;
  }

  hasTrustScore() {
    return this.trusts.some((n: number) => n > 0);
  }

  hasDistrustScore() {
    return this.distrusts.some((n: number) => n > 0);
  }

  renderTrustCount(forceRender: boolean = false) {
    if (!this.hasTrustScore() && !forceRender) return '';

    let r = this.trusts.join('/');
    return r;
  }

  renderDistrustCount(forceRender: boolean = false) {
    if (!this.hasDistrustScore() && !forceRender) return '';

    let r = this.distrusts.join('/');
    return r;
  }
}

export default TrustScore;
