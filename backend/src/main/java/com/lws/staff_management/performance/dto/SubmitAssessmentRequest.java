package com.lws.staff_management.performance.dto;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class SubmitAssessmentRequest {

    // Can be passed as Map<questionId, optionId>
    private Map<Long, Long> answers = new HashMap<>();

    // Or as a list of answer objects
    private List<AnswerItem> answerList;

    public static class AnswerItem {
        private Long questionId;
        private Long optionId;

        public AnswerItem() {}
        public AnswerItem(Long questionId, Long optionId) {
            this.questionId = questionId;
            this.optionId = optionId;
        }

        public Long getQuestionId() { return questionId; }
        public void setQuestionId(Long questionId) { this.questionId = questionId; }

        public Long getOptionId() { return optionId; }
        public void setOptionId(Long optionId) { this.optionId = optionId; }
    }

    public SubmitAssessmentRequest() {}

    public Map<Long, Long> getResolvedAnswers() {
        Map<Long, Long> map = new HashMap<>();
        if (answers != null) {
            map.putAll(answers);
        }
        if (answerList != null) {
            for (AnswerItem item : answerList) {
                if (item.getQuestionId() != null && item.getOptionId() != null) {
                    map.put(item.getQuestionId(), item.getOptionId());
                }
            }
        }
        return map;
    }

    public Map<Long, Long> getAnswers() { return answers; }
    public void setAnswers(Map<Long, Long> answers) { this.answers = answers; }

    public List<AnswerItem> getAnswerList() { return answerList; }
    public void setAnswerList(List<AnswerItem> answerList) { this.answerList = answerList; }
}
