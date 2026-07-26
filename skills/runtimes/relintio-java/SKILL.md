---
name: relintio-java
description: Install and register the Relintio agent in a Java application. Use for Spring Boot filter registration and precedence ahead of Spring Security, Jakarta servlet filter declaration order, jakarta versus javax namespaces, and the com.relintio:relintio-agent artifact.
license: MIT
metadata:
  version: "1.0.0"
  runtime: "java"
---

# Java

Artifact: `com.relintio:relintio-agent` · Java 11+ · [quickstart](https://relintio.com/docs/quickstart/java)

## Install

Maven:

```xml
<dependency>
  <groupId>com.relintio</groupId>
  <artifactId>relintio-agent</artifactId>
  <version>0.1.6</version>
</dependency>
```

Gradle:

```groovy
implementation 'com.relintio:relintio-agent:0.1.6'
```

Confirm the current version against Maven Central rather than copying this one forward.

## Register — Spring Boot

```java
@Bean
public FilterRegistrationBean<RelintioFilter> relintio() {
    var registration = new FilterRegistrationBean<>(new RelintioFilter());
    registration.setOrder(Ordered.HIGHEST_PRECEDENCE);
    registration.addUrlPatterns("/*");
    return registration;
}
```

`HIGHEST_PRECEDENCE` is deliberate — the filter must run before Spring Security, not after it.

## Register — Jakarta servlet

```xml
<filter>
  <filter-name>relintio</filter-name>
  <filter-class>com.relintio.agent.RelintioFilter</filter-class>
</filter>
<filter-mapping>
  <filter-name>relintio</filter-name>
  <url-pattern>/*</url-pattern>
</filter-mapping>
```

Declare it first in `web.xml`; servlet filters run in declaration order.

## Gotchas

**Spring Security's filter chain is separate.** A `@Bean` filter without an explicit order can land after it. Set the order.

**`jakarta.servlet` and `javax.servlet` are not interchangeable.** Match the artifact to the container: Tomcat 10+ / Spring Boot 3 use `jakarta`.

**Configuration comes from the environment, not `application.properties`** — keep `UP_LICENSE_KEY` out of any file that ships in the jar.

**Check for an existing install:** `grep -n relintio pom.xml build.gradle build.gradle.kts 2>/dev/null`.

## Verify before you call it done

```bash
npx relintio@latest verify --domain example.com
```

`200` with a policy body means the license resolved and the deployment is bound. A `200` carrying `status: "expired"` is a failure wearing a success code — check the body, not just the status. Then open one safe public route so the agent checks in, and confirm the runtime and policy revision the dashboard reports match what you just installed.

Full response table and the rest of the workflow: `relintio-setup`. Score bands and exclusions: `relintio-policy`. When something is wrong: `relintio-debug`.
