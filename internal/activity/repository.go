package activity

import (
	"dotkey/db"
	"time"
)

type ActivityEntry struct {
	ID              string     `json:"id"`
	Key             string     `json:"key"`
	Action          string     `json:"action"`
	EnvironmentID   string     `json:"environment_id"`
	EnvironmentName string     `json:"environment_name"`
	ActorID         string     `json:"actor_id"`
	ActorName       string     `json:"actor_name"`
	ActorEmail      string     `json:"actor_email"`
	CreatedAt       time.Time  `json:"created_at"`
}

type Repository struct{}

func NewRepository() *Repository { return &Repository{} }

func (r *Repository) ListByProject(projectID, envFilter, actionFilter string, limit, offset int) ([]ActivityEntry, error) {
	query := `
		SELECT
			vv.id,
			vv.key,
			vv.action,
			vv.created_at,
			vv.actor_id,
			e.id   AS environment_id,
			e.name AS environment_name,
			u.name AS actor_name,
			u.email AS actor_email
		FROM variable_versions vv
		JOIN environments e ON e.id = vv.environment_id
		JOIN users u ON u.id = vv.actor_id
		WHERE e.project_id = ?`

	args := []any{projectID}

	if envFilter != "" {
		query += " AND e.id = ?"
		args = append(args, envFilter)
	}
	if actionFilter != "" {
		query += " AND vv.action = ?"
		args = append(args, actionFilter)
	}

	query += " ORDER BY vv.created_at DESC LIMIT ? OFFSET ?"
	args = append(args, limit, offset)

	rows, err := db.DB.Raw(query, args...).Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []ActivityEntry
	for rows.Next() {
		var e ActivityEntry
		if err := rows.Scan(
			&e.ID, &e.Key, &e.Action, &e.CreatedAt, &e.ActorID,
			&e.EnvironmentID, &e.EnvironmentName,
			&e.ActorName, &e.ActorEmail,
		); err != nil {
			return nil, err
		}
		results = append(results, e)
	}
	return results, nil
}
