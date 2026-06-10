export interface ReviewEntity {
  id: number;
  routeId: number;
  fromUserId: number;
  toUserId: number;
  score: number;
  comment: string | null;
  createdAt: Date | null;
}

export interface IReviewRepository {
  findExistingReview(routeId: number, fromUserId: number, toUserId: number): Promise<ReviewEntity | null>;
  
  createReview(review: Omit<ReviewEntity, "id" | "createdAt">): Promise<ReviewEntity>;
  
  getReviewsByToUserId(toUserId: number): Promise<ReviewEntity[]>;
  
  getRouteById(routeId: number): Promise<{ id: number; status: string; driverId: number } | null>;
  
  getPassengerJoinRequest(routeId: number, passengerId: number, status: string): Promise<any | null>;
  
  getUserReviewStats(userId: number): Promise<{ avgScore: number | string | null; count: number } | null>;
  
  updateUserRatingStats(userId: number, rating: string | null, reviewCount: number): Promise<void>;

  getMyReviewsForRoute(routeId: number, fromUserId: number): Promise<ReviewEntity[]>;
}
