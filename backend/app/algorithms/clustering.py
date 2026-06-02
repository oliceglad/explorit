from typing import Any

import numpy as np


def cluster_points(points: list[dict[str, Any]], n_clusters: int = 3) -> list[list[dict]]:
    """Simple k-means clustering of POI points by lat/lon."""
    if len(points) <= n_clusters:
        return [[p] for p in points]

    coords = np.array([[p["lat"], p["lon"]] for p in points])
    # Random init
    indices = np.random.choice(len(coords), n_clusters, replace=False)
    centers = coords[indices]

    for _ in range(100):
        dists = np.linalg.norm(coords[:, None] - centers[None, :], axis=2)
        labels = np.argmin(dists, axis=1)
        new_centers = np.array([coords[labels == k].mean(axis=0) if (labels == k).any() else centers[k]
                                 for k in range(n_clusters)])
        if np.allclose(centers, new_centers, atol=1e-7):
            break
        centers = new_centers

    clusters: list[list[dict]] = [[] for _ in range(n_clusters)]
    for i, label in enumerate(labels):
        clusters[label].append(points[i])
    return clusters
