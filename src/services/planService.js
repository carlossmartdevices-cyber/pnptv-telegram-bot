const { db } = require("../config/firebase");

class PlanService {
  constructor() {
    this.plansCollection = db.collection("plans");
  }

  async createPlan({ name, price, duration, features, tier, description }) {
    const plan = {
      name,
      price: Number(price),
      duration: Number(duration), // in days
      features: Array.isArray(features) ? features : [],
      tier,
      description,
      createdAt: Date.now(),
      active: true,
    };

    const docRef = await this.plansCollection.add(plan);
    return { id: docRef.id, ...plan };
  }

  async getActivePlans() {
    const snapshot = await this.plansCollection
      .where("active", "==", true)
      .orderBy("price", "asc")
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  async updatePlan(planId, updates) {
    await this.plansCollection.doc(planId).update(updates);
    return { id: planId, ...updates };
  }

  async deletePlan(planId) {
    await this.plansCollection.doc(planId).update({ active: false });
  }
}

module.exports = new PlanService();

