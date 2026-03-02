-- Fix calculate_review_scores function to use respondent_type instead of respondent

CREATE OR REPLACE FUNCTION calculate_review_scores(p_review_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_employee_score DECIMAL(5,2);
    v_manager_score DECIMAL(5,2);
    v_overall_score DECIMAL(5,2);
    v_max_score DECIMAL(5,2);
    v_values_score DECIMAL(5,2);
BEGIN
    -- Calculate employee self-assessment score
    SELECT 
        COALESCE(AVG(rr.response_number), 0),
        COUNT(*) * 5  -- Assuming max score is 5 per question
    INTO v_employee_score, v_max_score
    FROM review_responses rr
    JOIN review_template_questions rtq ON rtq.id = rr.question_id
    WHERE rr.review_id = p_review_id
    AND rr.respondent_type = 'employee'  -- FIXED: was rr.respondent
    AND rr.response_number IS NOT NULL
    AND rtq.include_in_score = true;

    -- Calculate manager assessment score
    SELECT COALESCE(AVG(rr.response_number), 0)
    INTO v_manager_score
    FROM review_responses rr
    JOIN review_template_questions rtq ON rtq.id = rr.question_id
    WHERE rr.review_id = p_review_id
    AND rr.respondent_type = 'manager'  -- FIXED: was rr.respondent
    AND rr.response_number IS NOT NULL
    AND rtq.include_in_score = true;

    -- Calculate overall (average of both)
    IF v_employee_score > 0 AND v_manager_score > 0 THEN
        v_overall_score := (v_employee_score + v_manager_score) / 2;
    ELSIF v_manager_score > 0 THEN
        v_overall_score := v_manager_score;
    ELSE
        v_overall_score := v_employee_score;
    END IF;

    -- Calculate values score (from behavior tier selections)
    SELECT COALESCE(AVG(rr.behavior_tier_selected), 0)
    INTO v_values_score
    FROM review_responses rr
    WHERE rr.review_id = p_review_id
    AND rr.behavior_tier_selected IS NOT NULL;

    -- Update the review record
    UPDATE reviews
    SET 
        employee_self_score = v_employee_score,
        manager_score = v_manager_score,
        overall_score = v_overall_score,
        values_score = v_values_score,
        max_possible_score = v_max_score,
        updated_at = NOW()
    WHERE id = p_review_id;

END;
$$;


