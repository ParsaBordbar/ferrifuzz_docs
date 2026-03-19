---
sidebar_label: 'Basic Concepts'
sidebar_position: 1
---

# Fuzzy Concepts
In this section we are going to learn about the core ideas in Fuzzy Logic.

## Rules

A rule has the structure “IF p THEN q,” in which p is called the rule’s antecedent and q is called the rule’s consequent. A rule-based system begins with a collection of such rules, either provided by one or more domain experts or extracted from domain-speci c data. Rule antecedents are in terms of variables that can be observed or measured and are denoted xi (i = 1, . . ., p).

Each rule tells us something about a desired output, denoted y.
To keep things as simple as possible in this discussion, here are three expert-based rules for when to adjust an
air-conditioning (AC) unit, in which there is only one antecedent variable, x = temperature, and one output,
y = AC adjustment:

:::tip[Fuzzy Rule (1.1)]

    IF x is moderate, THEN y= adjust the AC to around low

    IF x is high, THEN y= adjust the AC to moderate to high

    IF x is very high, THEN y= adjust the AC to around high
:::

A rule-based AC adjustment system would be implemented in software or hardware, is activated by measured values of
temperature, and automatically adjusts the AC level.
The rst thing to notice from the rules in (1.1) is that they use linguistic terms (words) for both temperature and the AC
adjustment. Since software and hardware deal with numbers and not words, there seems to be a big mismatch between the
statement of the rules in (1.1) and being able to implement them so that a measured value of temperature leads to an AC
adjustment. Mathematics is needed to quantify these rules and to process a measured value of temperature into a numerical AC
adjustment. This book provides this mathematics.
The second thing to notice from the rules in (1.1) is that the words used in the rules are not very precise, for example, what
does “moderate temperature” mean, or “around low”? Actually, these terms can mean different things to different people and
so linguistic uncertainties are present in these rules. Mathematical models are needed that capture linguistic uncertainties. This
book provides such mathematical models.
The third thing to notice from these rules is that measurements of temperature (that will activate these rules) may be
inaccurate, and so mathematical models are needed that account for such inaccuracies. This book also provides the
mathematical models to do this.
The fourth thing to notice from these rules is that the words moderate, high, and very high partition temperature into three
regions, and so regardless of the nature of rule’s consequents (which in other applications could be numbers, functions,

categories, words or a mixture of these), the rules that are considered in this book begin by partitioning their inputs over their
application-dependent domains. Each consequent lls a rule’s speci c partition with a number, function, category, or word.

## Partions and Sets

![Partions and Sets](/img/basic-concepts/partions.png)

